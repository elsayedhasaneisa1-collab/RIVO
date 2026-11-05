export type Stats = {
  days: number;
  showProfit: boolean;
  totals: {
    orders: number;
    sales: number;
    netSales: number;
    realizedSales: number;
    averageOrder: number;
    awaitingPayment: number;
    paymentReview: number;
    deliveredCount: number;
    cancelledCount: number;
    products: number;
    customers: number;
    paidOrders: number;
  };
  profits: { expected: number; pending: number; realized: number; lost: number } | null;
  statusBreakdown: Record<string, number>;
  series: { day: string; orders: number; sales: number; profit: number | null }[];
  topProducts: { productId: number | null; name: string; sku: string; image: string | null; quantity: number; revenue: number; profit: number | null }[];
  lowStock: { id: number; name: string; sku: string; stock: number; lowStockThreshold: number }[];
  recentOrders: { id: number; reference: string; name: string; status: string; total: number; createdAt: string }[];
};
