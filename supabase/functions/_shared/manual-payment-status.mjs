export function paymentStatus(rows) {
  const approved = rows.find((row) => row.status === 'approved');
  return {
    approved: Boolean(approved),
    pending: !approved && rows.some((row) => row.status === 'pending'),
    receipt: approved ? {
      id: approved.id,
      approved_at: approved.approved_at,
      email: approved.email,
      amount: approved.amount,
    } : null,
  };
}