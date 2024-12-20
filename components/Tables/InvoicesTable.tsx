import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { Input } from '@/components/ui/input';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Pencil, X, Check } from 'lucide-react';
import { Invoice, updateInvoice } from '@/app/redux/slices/dataSlice';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"

interface InvoicesTableProps {
	invoices: Invoice[];
}

const InvoicesTable: React.FC<InvoicesTableProps> = ({ invoices }) => {
	const dispatch = useDispatch();
	const [editingId, setEditingId] = useState<string | null>(null);
	const [editData, setEditData] = useState<Partial<Invoice>>({});
	const [selectedText, setSelectedText] = useState<string | null>(null);
	const [selectedProductText, setSelectedProductText] = useState<string | null>(null);

	const startEdit = (item: Invoice) => {
		setEditingId(item.id);
		setEditData({
			serialNumber: item.serialNumber,
			customerName: item.customerName,
			productName: item.productName,
			quantity: item.quantity,
			bankDetails: item.bankDetails,
			date: item.date
		});
	};

	const handleChange = (field: keyof Invoice, value: string | number) => {
		setEditData(prev => ({
			...prev,
			[field]: field === 'quantity' ? Number(value) : value
		}));
	};


	const saveChanges = () => {
		if (editingId) {
			dispatch(updateInvoice({
				id: editingId,
				...editData
			}));
			setEditingId(null);
		}
	};

	const cancelEdit = () => {
		setEditingId(null);
		setEditData({});
	};

	return (
		<TabsContent value="invoices">
			{invoices.length > 0 ? (
				<div className="table-container">
					<table className="w-full">
						<thead className="table-header">
							<tr>
								<th>Invoice ID</th>
								<th>Customer Name</th>
								<th>Product Name</th>
								<th>Quantity</th>
								<th>Bank Details</th>
								<th>Price With Tax</th>
								<th>Date</th>
								<th>Actions</th>
							</tr>
						</thead>
						<tbody className="table-body">
							{invoices.map((item) => (
								<tr key={item.id} className="table-row">
									<td className="table-cell">
										{editingId === item.id ? (
											<Input
												value={editData.serialNumber}
												onChange={(e) => handleChange('serialNumber', e.target.value)}
												className="w-full"
											/>
										) : (
											item.serialNumber
										)}
									</td>
									<td className="table-cell">
										{editingId === item.id ? (
											<Input
												value={editData.customerName}
												onChange={(e) => handleChange('customerName', e.target.value)}
												className="w-full"
											/>
										) : (
											item.customerName
										)}
									</td>
									<td className="table-cell">
										{editingId === item.id ? (
											<Input
												value={editData.productName}
												onChange={(e) => handleChange('productName', e.target.value)}
												className="w-full"
											/>
										) : (
											<div className="relative">
												<button
													onClick={() => setSelectedProductText(item.productName)}
													className="text-left hover:text-gray-600 focus:outline-none"
												>
													<span className="truncate block w-40" title={item.productName}>
														{item.productName ? `${item.productName.slice(0, 20)}...` : '-'}
													</span>
												</button>

												<Dialog open={!!selectedProductText} onOpenChange={() => setSelectedProductText(null)}>
													<DialogContent className="max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200">
														<DialogHeader className="border-b pb-2">
															<DialogTitle className="text-lg font-semibold">Product Name</DialogTitle>
														</DialogHeader>

														<div className="p-4">
															<p className="text-sm whitespace-pre-wrap break-words">
																{selectedProductText || 'No details available'}
															</p>
														</div>
													</DialogContent>
												</Dialog>
											</div>
										)}
									</td>
									<td className="table-cell">
										{editingId === item.id ? (
											<Input
												type="number"
												value={editData.quantity}
												onChange={(e) => handleChange('quantity', e.target.value)}
												className="w-full"
											/>
										) : (
											item.quantity
										)}
									</td>
									<td className="table-cell">
										{editingId === item.id ? (
											<Input
												type="string"
												value={editData.bankDetails}
												onChange={(e) => handleChange('bankDetails', e.target.value)}
												className="w-full"
											/>
										) : (
											<div className="relative">
												<button
													onClick={() => setSelectedText(item.bankDetails)}
													className="text-left hover:text-gray-600 focus:outline-none"
												>
													<span className="truncate block w-40" title={item.bankDetails}>
														{item.bankDetails ? `${item.bankDetails.slice(0, 30)}...` : '-'}
													</span>
												</button>

												<Dialog open={!!selectedText} onOpenChange={() => setSelectedText(null)}>
													<DialogContent className="max-w-2xl bg-white rounded-lg shadow-lg border border-gray-200">
														<DialogHeader className="border-b pb-2">
															<DialogTitle className="text-lg font-semibold">Bank Details</DialogTitle>
														</DialogHeader>

														<div className="p-4">
															<p className="text-sm whitespace-pre-wrap break-words">
																{selectedText || 'No details available'}
															</p>
														</div>
													</DialogContent>
												</Dialog>

											</div>
										)}
									</td>

									<td className="table-cell">
										{item.priceWithTax}
									</td>
									<td className="table-cell">
										{item.date}
									</td>
									<td className="table-cell">
										{editingId === item.id ? (
											<div className="flex justify-center space-x-2">
												<Button
													onClick={saveChanges}
													variant="ghost"
													size="icon"
													className="h-8 w-8"
												>
													<Check className="h-4 w-4" />
												</Button>
												<Button
													onClick={cancelEdit}
													variant="ghost"
													size="icon"
													className="h-8 w-8"
												>
													<X className="h-4 w-4" />
												</Button>
											</div>
										) : (
											<Button
												onClick={() => startEdit(item)}
												variant="ghost"
												size="icon"
												className="h-8 w-8"
											>
												<Pencil className="h-4 w-4" />
											</Button>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			) : (
				<p className="text-gray-500 text-center py-4">No final data available</p>
			)}
		</TabsContent>
	);
};

export default InvoicesTable;