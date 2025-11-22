// lib/types.ts

export type Household = {
    id: string
    name: string
    created_at?: string
    // 👇 ADD THESE NEW FIELDS
    currency?: string
    country?: string
    avatar_url?: string
    cover_image_url?: string
}

export type List = {
    id: string
    name: string
    is_private: boolean
    owner_id: string | null
    household_id: string
    list_type?: 'wishlist' | 'shopping' // Optional: Good for strict typing
}

export type WishlistItem = {
    id: number
    created_at: string
    name: string
    target_amount: number | null
    quantity: number | null
    description: string | null // Note: Lowercase 'd' is standard, check your DB column name
    link: string | null
    is_complete: boolean
    user_id: string
    category: string
    saved_amount: number | null
    list_id: string
    priority?: string // 
}