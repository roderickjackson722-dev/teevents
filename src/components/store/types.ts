export interface Product {
  id: string;
  tournament_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  is_active: boolean | null;
  purchase_url: string | null;
  sort_order: number | null;
  vendor_name: string | null;
  vendor_url: string | null;
  template_id: string | null;
}

export interface ProductTemplate {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  default_price: number;
  image_url: string | null;
  category: string;
  vendor_name: string | null;
  vendor_url: string | null;
  vendor_notes: string | null;
  created_at: string;
}

export interface Tournament {
  id: string;
  title: string;
}

export const categories = [
  { value: "merchandise", label: "Merchandise" },
  { value: "apparel", label: "Apparel" },
  { value: "accessories", label: "Accessories" },
  { value: "tickets", label: "Tickets & Packages" },
  { value: "donations", label: "Donations" },
  { value: "other", label: "Other" },
];

export const categoryLabel = (val: string) =>
  categories.find((c) => c.value === val)?.label || val;

export const fmt = (n: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
