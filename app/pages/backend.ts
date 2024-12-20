'use server'
// app/actions/backend.ts
import { GoogleGenerativeAI } from "@google/generative-ai";
import processAllData from "@/components/ExcelProcessor";
//import fs from "fs";
//import path from "path";
import sharp from 'sharp';

//customerId, productId and unit price
interface Invoice {
	id: string;
	serialNumber: string;
	customerName: string;
	productName: string;
	quantity: number;
	priceWithTax: number;
	date: string;
	bankDetails: string;
}

interface Product {
	id: string;
	productName: string;
	quantity: number;
	unitPrice: number;
	tax: number;
	priceWithTax: number;
}

interface Customer {
	id: string;
	customerName: string;
	phoneNumber: string;
	address: string;
	totalPurchaseAmount: number;
}

interface ExtractedData {
	invoices: Invoice[];
	products: Product[];
	customers: Customer[];
}



export async function generateContent(formData: FormData) {

	try {
		const file = formData.get('file') as File;
		if (!file || !(file instanceof File)) {
			throw new Error('No file uploaded');
		}

		// Check if file is Excel
		if (
			file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
			file.type === 'application/vnd.ms-excel'
		) {
			// Convert File to ArrayBuffer before processing
			const buffer = await file.arrayBuffer();
			const extractedData = await processAllData(buffer);
			console.log("got this from excel \n")
			console.log("got this from excel \n")
			console.log(extractedData)
			return processExtractedData(extractedData);
		}


		let extractedText: string = await extractPdfContent(file);
		let mimeType: string;

		if (file.type === 'application/pdf') {
			extractedText = await extractPdfContent(file);
			mimeType = 'application/pdf';
		} else if (file.type.startsWith('image/')) {
			validateImageFile(file)
			const result = await processImage(file);
			extractedText = result.data;
			mimeType = result.mimeType;
		} else {
			throw new Error('Unsupported file type');
		}

		const genAI = new GoogleGenerativeAI(process.env.API_KEY as string);
		const model = genAI.getGenerativeModel({
			model: "gemini-1.5-flash-002",
			generationConfig: {
				maxOutputTokens: 8192,
				temperature: 0.1,
			},
		});

		const [productsResult, metadataResult] = await Promise.all([
			model.generateContent([
				{ inlineData: { mimeType, data: extractedText } },
				{
					text: `Extract ONLY product details from the invoice. Return JSON with:
                    products ( 
                        product Name, quantity, unitPrice, tax, priceWithTax 
                    ),
                    Focus on accuracy of numbers and product details.`
				}
			]),
			model.generateContent([
				{ inlineData: { mimeType, data: extractedText } },
				{
					text: `Extract ONLY customer and invoice details. Return JSON with:
                    customers ( 
                        customer Name, phoneNumber, address, total purchase amount
                    ),
                    invoices (
                        serial Number,
                        total Amount,
                        date,
                        bank Details
                    )`
				}
			])
		]);

		console.log(`before parseAI ${productsResult.response.text()}`);
		const productsData = await parseAIResponse(productsResult.response.text());
		const metadataData = await parseAIResponse(metadataResult.response.text());

		const combinedData = {
			products: productsData.products || [],
			customers: metadataData.customers || [],
			invoices: metadataData.invoices || []
		};
		console.log(`after processing combined data ${JSON.stringify(combinedData)}`);

		return processExtractedData(combinedData);

	} catch (error) {
		console.error("Error in generateContent:", error);
		throw new Error(error instanceof Error ? error.message : 'Failed to generate content');
	}
}
async function processImage(file: File) {
    try {
        // First optimize the image
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        const processedBuffer = await sharp(buffer)
            .resize(1024, 1024, {
                fit: 'inside',
                withoutEnlargement: true
            })
            .jpeg({ quality: 80 })
            .toBuffer();

        // Convert processed buffer to base64
        const base64Data = processedBuffer.toString('base64');

        return {
            data: base64Data,
            mimeType: "image/jpeg"
        };
    } catch (error) {
        console.error("Error processing image:", error);
        throw error;
    }
}
// Helper function to validate file before processing
function validateImageFile(file: File): boolean {
	const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
	const maxSize = 10 * 1024 * 1024; // 10MB limit

	if (!validTypes.includes(file.type)) {
		throw new Error('Invalid file type. Please upload a valid image file.');
	}

	if (file.size > maxSize) {
		throw new Error('File size too large. Please upload an image smaller than 10MB.');
	}

	return true;
}


async function extractPdfContent(file: File): Promise<string> {
	const arrayBuffer = await file.arrayBuffer();
	return Buffer.from(arrayBuffer).toString('base64');
}

async function parseAIResponse(responseText: string) {
	try {
		// First try cleaning JSON markers
		const cleanedText = responseText.replace(/```json\n|\n```/g, '').trim();
		return JSON.parse(cleanedText);
	} catch (error) {
		// Fallback to extracting JSON from text
		const jsonMatch = responseText.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			return JSON.parse(jsonMatch[0]);
		}
		console.error("Error in parseAIResponse:", error);
	}
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function isExcelProcessedData(data: any): boolean {
	// Check if data has the exact structure we expect from Excel processing
	return (
		data &&
		Array.isArray(data.products) &&
		Array.isArray(data.invoices) &&
		data.invoices[0]?.hasOwnProperty('productName')
	);
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function processExtractedData(data: any): ExtractedData {
	if (isExcelProcessedData(data)) {
		// For Excel data, ensure there's at least one default customer
		const processedCustomers = data.customers.length > 0 ? data.customers : [{
			id: crypto.randomUUID(),
			customerName: '-',
			phoneNumber: '-',
			address: '-',
			totalPurchaseAmount: 0
		}];

		return {
			customers: processedCustomers,
			products: data.products,
			invoices: data.invoices
		};
	}

	// Initialize processed data structure
	const processedData: ExtractedData = {
		invoices: [],
		products: [],
		customers: []
	};

	// Process customers with default row if empty
	if (Array.isArray(data.customers) && data.customers.length > 0) {
		processedData.customers = data.customers.map((customer: any) => ({
			id: customer.id?.toString() || crypto.randomUUID(),
			customerName: customer.customerName || 'Unknown Customer',
			phoneNumber: customer.phoneNumber || '-',
			address: customer.address || '-',
			totalPurchaseAmount: Number(customer.totalPurchaseAmount) || 0
		}));
	} else {
		// Add a default customer row when no customers exist
		processedData.customers = [{
			id: crypto.randomUUID(),
			customerName: '-',
			phoneNumber: '-',
			address: '-',
			totalPurchaseAmount: 0
		}];
	}

	// Process products
	if (Array.isArray(data.products)) {
		processedData.products = data.products.map((product: any) => ({
			id: crypto.randomUUID(),
			productName: product.productName || 'Unknown Product',
			quantity: Number(product.quantity) || 0,
			unitPrice: Number(product.unitPrice) || 0,
			tax: product.tax ? parseFloat(product.tax.toString().replace('%', '')) : 0,
			priceWithTax: Number(product.priceWithTax) || 0
		}));
	}

	const formatBankDetails = (bankDetails: any): string => {
		if (!bankDetails || typeof bankDetails !== 'object') return 'N/A';
		return Object.entries(bankDetails)
			.map(([key, value]) => `${key}: ${value || 'Unknown'}`)
			.join(', ');
	};

	// Map invoices based on products and other data
	const invoiceData = data.invoices?.[0] || {};
	processedData.invoices = processedData.products.map((product) => ({
		id: crypto.randomUUID(),
		serialNumber: invoiceData.serialNumber || 'Unknown Invoice',
		customerName: processedData.customers[0]?.customerName || '-',
		productName: product.productName,
		quantity: product.quantity,
		bankDetails: formatBankDetails(invoiceData.bankDetails) || '-',
		priceWithTax: product.priceWithTax,
		date: invoiceData.date || null,
	}));

	return processedData;
}

// Mark the function as a server action
export async function processImageAction(formData: FormData) {
	'use server'; // This line is important!

	try {
		const file = formData.get('file') as File;

		if (!file) {
			throw new Error('No file provided');
		}

		const result = await processImage(file);
		return { success: true, data: result };
	} catch (error) {
		console.error('Error:', error);
		return { success: false, error: 'Error processing image' };
	}
}
