"use client"
import { handleOut } from "@/auth/login";
import { useAuth } from "../../context/AuthContext";
import {
    Hospital, Users, Stethoscope, Calendar, FileText, Settings, LogOut,
    Menu, X, UserCircle, Loader2, ChevronDown
} from 'lucide-react';
import { useState } from "react";
import { redirect, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";

interface NavLink {
    name: string;
    href: string;
    icon: React.ElementType;
    subItems?: {
        name: string;
        href: string;
        icon?: React.ElementType
    }[];
}

interface NavbarProps {
    navLinks: NavLink[];
    principal: string;
}

const Navbar = ({ navLinks, principal }: NavbarProps) => {
    const { user, role, nombres, apellidos, loading } = useAuth();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);

    const isActive = (href: string) => {
        if (href.includes('?')) {
            const [path, query] = href.split('?');
            const paramName = query.split('=')[0];
            const paramValue = query.split('=')[1];
            return pathname === path && searchParams.get(paramName) === paramValue;
        }
        if (href === principal) return pathname === href;
        return pathname.startsWith(href);
    };

    const handleSubMenuClick = (name: string) => {
        if (openSubMenu === name) {
            setOpenSubMenu(null);
        } else {
            setOpenSubMenu(name);
        }
    };

    const UserSection = () => {
        if (loading) return <div className="flex justify-center p-3 h-20"><Loader2 className="animate-spin text-white" /></div>;

        if (user) {
            return (
                <div className="relative">
                    <button
                        onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                        className="w-full flex items-center gap-3 p-3 rounded-lg text-left hover:bg-indigo-500 transition-colors"
                    >
                        <UserCircle className="w-10 h-10 shrink-0" />
                        <div className="truncate min-w-0">
                            <p className="font-semibold text-sm truncate uppercase">
                                {nombres && apellidos
                                    ? `${nombres} ${apellidos}`
                                    : user.email?.split('@')[0] || 'USUARIO'}
                            </p>
                            <p className="text-xs text-indigo-100 capitalize font-medium">
                                {role || 'Usuario'}
                            </p>
                        </div>
                    </button>
                    {isUserMenuOpen && (
                        <div className="absolute bottom-full left-0 mb-2 w-full bg-white text-gray-800 rounded-lg shadow-lg overflow-hidden z-30">
                            <a href="#" className="flex items-center gap-3 px-4 py-3 hover:bg-gray-100">
                                <Settings className="w-5 h-5" />
                                <span>Configurar</span>
                            </a>
                            <button
                                onClick={() => { handleOut(); redirect('/login'); setIsUserMenuOpen(false); }}
                                className="w-full text-left flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-gray-100"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>Cerrar sesión</span>
                            </button>
                        </div>
                    )}
                </div>
            );
        }
        return <div className="p-3 bg-indigo-500 rounded-lg"><p className="text-sm">Por favor, inicia sesión</p></div>;
    };

    return (
        <>
            {/* Header Móvil */}
            <header className="bg-indigo-400 text-white p-4 flex justify-between items-center md:hidden relative z-20 shadow-md">
                <div className="flex items-center gap-2"><Hospital className="w-8 h-8" /><Link href={principal} className="text-xl font-bold">Hospital Central</Link></div>
                <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-1 rounded-md hover:bg-indigo-500"><span className="sr-only">Menú</span>{isMobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}</button>
            </header>

            {/* Sidebar */}
            <aside className={`bg-indigo-400 text-white flex flex-col p-6 fixed md:sticky inset-y-0 left-0 w-64 h-screen transition-transform duration-300 ease-in-out z-10 md:z-auto shadow-xl md:shadow-lg ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>

                <div className="flex justify-between items-center md:hidden mb-6">
                    <div className="flex items-center gap-2"><Hospital className="w-8 h-8" /><span className="text-xl font-bold">Hospital Central</span></div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 rounded-md hover:bg-indigo-500"><X className="w-7 h-7" /></button>
                </div>

                <div className="hidden md:flex items-center gap-3 mb-8"><Hospital className="w-10 h-10" /><Link href="/admin" className="text-2xl font-bold">Hospital Central</Link></div>

                <nav className="flex-1 overflow-y-auto">
                    <ul className="flex flex-col gap-2">
                        {navLinks.map((link) => (
                            <li key={link.name}>
                                {link.subItems ? (
                                    <div>
                                        <button
                                            onClick={() => handleSubMenuClick(link.name)}
                                            className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${pathname.startsWith(link.href) ? 'bg-indigo-500' : 'hover:bg-indigo-500'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <link.icon className="w-5 h-5" />
                                                <span>{link.name}</span>
                                            </div>
                                            <ChevronDown
                                                className={`w-4 h-4 transition-transform duration-200 ${openSubMenu === link.name ? 'rotate-180' : ''
                                                    }`}
                                            />
                                        </button>

                                        {(openSubMenu === link.name || pathname.startsWith(link.href)) && (
                                            <ul className="mt-1 ml-4 border-l-2 border-indigo-300 pl-2 space-y-1">
                                                {link.subItems.map((sub) => (
                                                    <li key={sub.name}>
                                                        <Link
                                                            href={sub.href}
                                                            className={`block p-2 rounded-md text-sm transition-colors ${
                                                                // AQUÍ ESTABA EL ERROR: Ahora usamos la función segura isActive
                                                                isActive(sub.href)
                                                                    ? 'text-white font-bold bg-indigo-500/50'
                                                                    : 'text-indigo-100 hover:text-white hover:bg-indigo-500/30'
                                                                }`}
                                                        >
                                                            {sub.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        href={link.href}
                                        className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive(link.href) ? 'bg-indigo-500' : 'hover:bg-indigo-500'
                                            }`}
                                    >
                                        <link.icon className="w-5 h-5" />
                                        <span>{link.name}</span>
                                    </Link>
                                )}
                            </li>
                        ))}
                    </ul>
                </nav>

                <div className="mt-auto pt-4 border-t border-indigo-300/30">
                    <UserSection />
                </div>
            </aside>

            {isMobileMenuOpen && <div className="fixed inset-0 bg-black/50 z-0 md:hidden" onClick={() => setIsMobileMenuOpen(false)}></div>}
        </>
    );
};

export default Navbar;