// lib/constants.ts

export const CURRENCIES = [
    { code: "NGN", symbol: "₦", name: "Nigerian Naira" },
    { code: "USD", symbol: "$", name: "US Dollar" },
    { code: "GBP", symbol: "£", name: "British Pound" },
    { code: "EUR", symbol: "€", name: "Euro" },
    { code: "CAD", symbol: "C$", name: "Canadian Dollar" },
    { code: "AUD", symbol: "A$", name: "Australian Dollar" },
    { code: "JPY", symbol: "¥", name: "Japanese Yen" },
    { code: "CNY", symbol: "¥", name: "Chinese Yuan" },
    { code: "INR", symbol: "₹", name: "Indian Rupee" },
    { code: "GHS", symbol: "₵", name: "Ghanaian Cedi" },
    { code: "ZAR", symbol: "R", name: "South African Rand" },
    { code: "KES", symbol: "KSh", name: "Kenyan Shilling" },
    { code: "RWF", symbol: "FRw", name: "Rwandan Franc" },
    { code: "TZS", symbol: "TSh", name: "Tanzanian Shilling" },
    { code: "UGX", symbol: "USh", name: "Ugandan Shilling" },
    { code: "EGP", symbol: "E£", name: "Egyptian Pound" },
    { code: "AED", symbol: "د.إ", name: "UAE Dirham" },
    { code: "SAR", symbol: "﷼", name: "Saudi Riyal" },
    { code: "BRL", symbol: "R$", name: "Brazilian Real" },
    { code: "MXN", symbol: "$", name: "Mexican Peso" },
    { code: "XOF", symbol: "CFA", name: "West African CFA" },
    { code: "XAF", symbol: "FCFA", name: "Central African CFA" },
];

export const EXPENSE_CATEGORIES = ["Groceries", "Rent/Mortgage", "Utilities", "Transport", "Subscriptions", "Personal", "Other"];

export const COUNTRIES = [
    "Nigeria", "Ghana", "Kenya", "South Africa", "Rwanda", "Tanzania", "Uganda", "Egypt", "Cameroon", "Senegal", "Ivory Coast",
    "United States", "United Kingdom", "Canada", "Australia", "India", "China", "Japan", "Germany", "France", "Brazil", "Other"
];

// Helper to get symbol
export const getCurrencySymbol = (code: string = 'NGN') => {
    return CURRENCIES.find(c => c.code === code)?.symbol || code;
};