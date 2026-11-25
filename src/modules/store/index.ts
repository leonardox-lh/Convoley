import { db } from "@/lib/db";
import { ORDER_FILTERS, type OrderFilter } from "./domain/order";
import {
  makeAddProductPhoto,
  makeCreateProduct,
  makeRemoveProductPhoto,
  makeSetProductActive,
  makeUpdateProduct,
} from "./application/products";
import {
  makeCreateOrder,
  makeSettleOrderNotification,
  makeSettleOrderPayment,
  makeStartOrderMercadoPagoPayment,
  makeSubmitOrderVoucher,
} from "./application/orders";
import {
  makeApproveOrderVoucher,
  makeMarkOrderDelivered,
  makeRejectOrderVoucher,
} from "./application/manage-orders";
import { productImagesAdapter, serviceFeesAdapter } from "./infrastructure/clubs-adapter";
import { pickupEventsAdapter } from "./infrastructure/events-adapter";
import { gatewayAdapter, orderPaymentsAdapter } from "./infrastructure/payments-adapter";
import {
  findOrders,
  prismaOrderRepository,
  prismaTransactions,
} from "./infrastructure/prisma-order-repository";
import {
  listClubProducts,
  prismaProductRepository,
} from "./infrastructure/prisma-product-repository";

const products = prismaProductRepository(db);

// ─── Products (HU-23) ───
export const createProduct = makeCreateProduct({ products });
export const updateProduct = makeUpdateProduct({ products });
export const setProductActive = makeSetProductActive({ products });
export const addProductPhoto = makeAddProductPhoto({ products, images: productImagesAdapter });
export const removeProductPhoto = makeRemoveProductPhoto({ products });
export const findProduct = (clubId: string, productId: string) => products.find(clubId, productId);
export const listProducts = (clubId: string, options: { onlyActive: boolean }) =>
  listClubProducts(db, clubId, options);
export type { StoredProduct as Product } from "./application/ports";
export {
  MAX_PRODUCT_PHOTOS,
  PRODUCT_NAME_MAX_LENGTH,
  SIZE_MAX_LENGTH,
  type VariantInput,
} from "./domain/product";
export {
  InvalidProductError,
  ProductNotFoundError,
  TooManyPhotosError,
  type InvalidProductReason,
} from "./domain/errors";

// ─── Orders (HU-24, HU-25) ───
const orders = prismaOrderRepository(db);
const transactions = prismaTransactions(db);
const orderPaymentDeps = {
  orders,
  gateway: gatewayAdapter,
  payments: orderPaymentsAdapter,
  transactions,
};
const settleOrderPayment = makeSettleOrderPayment(orderPaymentDeps);

export const createOrder = makeCreateOrder({ orders, pickupEvents: pickupEventsAdapter });
export const startOrderMercadoPagoPayment = makeStartOrderMercadoPagoPayment(
  { ...orderPaymentDeps, serviceFees: serviceFeesAdapter },
  settleOrderPayment,
);
export const settleOrderNotification = makeSettleOrderNotification(
  orderPaymentDeps,
  settleOrderPayment,
);
export const submitOrderVoucher = makeSubmitOrderVoucher(orderPaymentDeps);
export const findOrder = async (orderId: string) =>
  (await findOrders(db, { id: orderId }))[0] ?? null;
export type { OrderListItem } from "./infrastructure/prisma-order-repository";
export { MAX_QUANTITY_PER_ITEM } from "./domain/cart";
export { ORDER_FILTERS, ORDER_STATUSES, type OrderFilter, type OrderStatus } from "./domain/order";

const reviewDeps = { ...orderPaymentDeps, now: () => new Date() };
export const approveOrderVoucher = makeApproveOrderVoucher(reviewDeps);
export const rejectOrderVoucher = makeRejectOrderVoucher(reviewDeps);
export const markOrderDelivered = makeMarkOrderDelivered(reviewDeps);
/** HU-25: the club's orders, newest first, optionally of one filter. */
export const listOrders = (clubId: string, filter: OrderFilter | null) =>
  findOrders(db, { clubId, ...(filter && { status: { in: [...ORDER_FILTERS[filter]] } }) });
export {
  InvalidCartError,
  MercadoPagoUnavailableError,
  NothingToReviewError,
  OrderNotFoundError,
  OrderStatusError,
  OutOfStockError,
  PickupEventNotAvailableError,
} from "./domain/errors";
