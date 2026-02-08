import { format } from "date-fns";

export const formatCurrency = (val, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency }).format(val);

export const formatDate = (date) => format(new Date(date), "yyyy-MM-dd HH:mm:ss");
