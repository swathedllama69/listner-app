import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-4 text-center">
            <h2 className="text-6xl font-black text-slate-200 mb-4">404</h2>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Page Not Found</h3>
            <p className="text-slate-500 text-sm mb-8">The page you are looking for does not exist.</p>
            <Link href="/">
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl gap-2">
                    <Home className="w-4 h-4" /> Go Home
                </Button>
            </Link>
        </div>
    );
}