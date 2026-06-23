// Generate + download a PDF invoice for an order, drawn directly with jsPDF
// (no DOM screenshot, so it never comes out blank). Shared by the customer
// order page and the admin orders page. Throws on failure — callers show a toast.
export async function downloadInvoice(order) {
  if (!order) return

  const jspdfMod  = await import('jspdf')
  const jsPDF     = jspdfMod.jsPDF || jspdfMod.default
  const autoMod   = await import('jspdf-autotable')
  const autoTable = autoMod.autoTable || autoMod.default

  const doc   = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageW = doc.internal.pageSize.getWidth()
  const M     = 14
  const right = pageW - M
  const money = (n) => `$${Number(n || 0).toFixed(2)}`
  const orderNo = order.order_number ?? order.id
  const dateStr = new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  // Header
  doc.setFont('helvetica', 'bold');   doc.setFontSize(22); doc.setTextColor(15);  doc.text('Pick&Go LB', M, 20)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);  doc.setTextColor(150); doc.text('support@pickandgo.lb', M, 25)
  doc.setFont('helvetica', 'bold');   doc.setFontSize(16); doc.setTextColor(15);  doc.text('INVOICE', right, 19, { align: 'right' })
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(90);  doc.text(`Order #${orderNo}`, right, 25, { align: 'right' })
  doc.setFontSize(9); doc.setTextColor(150); doc.text(dateStr, right, 30, { align: 'right' })
  doc.setDrawColor(15); doc.setLineWidth(0.5); doc.line(M, 34, right, 34)

  // Billed / shipped to
  const y = 44
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(150); doc.text('BILLED / SHIPPED TO', M, y)
  const addr = []
  if (order.full_name)     addr.push(order.full_name)
  if (order.address_line1) addr.push(order.address_line1 + (order.address_line2 ? `, ${order.address_line2}` : ''))
  const cityLine = [order.city, order.state].filter(Boolean).join(', ')
  if (cityLine || order.zip) addr.push(`${cityLine}${order.zip ? ' ' + order.zip : ''}`.trim())
  if (order.country) addr.push(order.country)
  if (order.phone)   addr.push(order.phone)
  if (!addr.length)  addr.push('—')
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40); doc.text(addr, M, y + 6)

  // Order details
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(150); doc.text('ORDER DETAILS', right, y, { align: 'right' })
  const details = [
    `Status: ${order.status}`,
    `Payment: ${(order.payment_method || '—').replace(/_/g, ' ')}`,
    `Payment status: ${order.payment_status || 'pending'}`,
  ]
  if (order.tracking_number) details.push(`Tracking: ${order.tracking_number}`)
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40); doc.text(details, right, y + 6, { align: 'right' })

  // Items table
  autoTable(doc, {
    startY: y + 6 + Math.max(addr.length, details.length) * 5 + 6,
    head: [['Item', 'Qty', 'Unit Price', 'Total']],
    body: (order.items || []).map(it => [
      it.product_name_snapshot + (it.sku_snapshot ? `\nSKU: ${it.sku_snapshot}` : ''),
      String(it.quantity),
      money(it.unit_price),
      money(it.total_price),
    ]),
    theme: 'grid',
    headStyles: { fillColor: [15, 15, 15], textColor: 255, fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 2.5, textColor: 40, lineColor: [228, 225, 217] },
    columnStyles: {
      1: { halign: 'center', cellWidth: 18 },
      2: { halign: 'right',  cellWidth: 30 },
      3: { halign: 'right',  cellWidth: 30, fontStyle: 'bold' },
    },
    margin: { left: M, right: M },
  })

  // Totals
  let ty = doc.lastAutoTable.finalY + 8
  const labelX = right - 55
  const totalLine = (lbl, val, bold) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(bold ? 12 : 10)
    doc.setTextColor(bold ? 15 : 90)
    doc.text(lbl, labelX, ty)
    doc.text(val, right, ty, { align: 'right' })
    ty += bold ? 8 : 6
  }
  totalLine('Subtotal', money(order.subtotal))
  if (Number(order.discount) > 0) totalLine('Discount', `-${money(order.discount)}`)
  totalLine('Shipping', Number(order.shipping_fee) === 0 ? 'Free' : money(order.shipping_fee))
  if (Number(order.tax) > 0) totalLine('Tax', money(order.tax))
  doc.setDrawColor(15); doc.setLineWidth(0.4); doc.line(labelX, ty - 2, right, ty - 2); ty += 2
  totalLine('Total', money(order.total), true)

  // Footer
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(150)
  doc.text('Thank you for shopping with us  ·  MyShop', pageW / 2, ty + 12, { align: 'center' })

  doc.save(`invoice-${orderNo}.pdf`)
}
