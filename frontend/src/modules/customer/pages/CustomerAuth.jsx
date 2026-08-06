import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@core/context/AuthContext';
import { useSettings } from '@core/context/SettingsContext';
import {
    Phone,
    ShieldCheck,
    User,
    ShoppingBag,
    ChevronRight,
    MapPin,
    Zap,
    Utensils,
    Smartphone,
    ShoppingBasket,
    Heart,
    Star,
    ChevronLeft,
    Wheat,
    Sprout,
    Milk,
    Lock,
    Mail
} from 'lucide-react';
import { toast } from 'sonner';
import { customerApi } from '../services/customerApi';
import { cn } from '@/lib/utils';
import BgImage from '@/assets/image.png';

const CATEGORIES = [
    {
        title: "Farm Grains",
        icon: <Wheat size={28} />,
        color: "#fdf8e2",
        ring: "#eab308",
        text: "#854d0e",
        theme: "#eab308",
        shadow: "rgba(234, 179, 8, 0.3)",
        img: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600"
    },
    {
        title: "Organic Veggies",
        icon: <Sprout size={28} />,
        color: "#f0fdf4",
        ring: "#22c55e",
        text: "#166534",
        theme: "#22c55e",
        shadow: "rgba(34, 197, 150, 0.3)",
        img: "https://images.unsplash.com/photo-1592417817098-8f3d6eb19675?auto=format&fit=crop&q=80&w=600"
    },
    {
        title: "Pure Dairy",
        icon: <Milk size={28} />,
        color: "#eff6ff",
        ring: "#3b82f6",
        text: "#1e3a8a",
        theme: "#3b82f6",
        shadow: "rgba(59, 130, 246, 0.3)",
        img: "https://images.unsplash.com/photo-1528498033373-3c6c08e93d79?auto=format&fit=crop&q=80&w=600"
    },
    {
        title: "Canteen Meals",
        icon: <Utensils size={28} />,
        color: "#fff7ed",
        ring: "#ea580c",
        text: "#9a3412",
        theme: "#ea580c",
        shadow: "rgba(234, 88, 12, 0.3)",
        img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=600"
    },
];

const CustomerAuth = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [showOtp, setShowOtp] = useState(false);
    const [timer, setTimer] = useState(0);
    const [carouselIndex, setCarouselIndex] = useState(0);
    const [otpFocused, setOtpFocused] = useState(true);
    const { login } = useAuth();
    const { settings } = useSettings();
    const appName = settings?.appName || 'eAnnadata canteen';
    const logoUrl = settings?.logoUrl || '';

    const [formData, setFormData] = useState(() => {
        const savedPhone = sessionStorage.getItem('temp_login_phone') || '';
        return {
            firstName: '',
            lastName: '',
            phone: savedPhone,
            email: '',
            otp: ''
        };
    });
    const [signupErrors, setSignupErrors] = useState({});

    const activeCategory = CATEGORIES[carouselIndex];

    const handleInputFocus = (e) => {
        const target = e.target;
        setTimeout(() => {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    useEffect(() => {
        setIsLogin(location.pathname !== '/signup');
        // Reset form data and OTP view when switching paths, preserving saved phone number
        const savedPhone = sessionStorage.getItem('temp_login_phone') || '';
        setFormData({
            firstName: '',
            lastName: '',
            phone: savedPhone,
            email: '',
            otp: ''
        });
        setShowOtp(false);

    }, [location.pathname]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCarouselIndex((prev) => (prev + 1) % CATEGORIES.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleSendOtp = async (e) => {
        e?.preventDefault();
        if (formData.phone.length !== 10) {
            toast.error('Enter valid 10-digit number');
            return;
        }
        setIsLoading(true);
        try {
            await customerApi.sendLoginOtp({ phone: formData.phone });
            setShowOtp(true);
            setTimer(30);
            toast.success('OTP sent!');
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || 'Failed to send OTP');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e?.preventDefault();
        const { firstName, lastName, phone, email } = formData;
        const errs = {};
        if (!firstName.trim()) errs.firstName = 'First name is required';
        if (!lastName.trim()) errs.lastName = 'Last name is required';
        if (phone.length !== 10) errs.phone = 'Enter valid 10-digit phone number';
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Enter a valid email address';
        if (Object.keys(errs).length > 0) {
            setSignupErrors(errs);
            return;
        }
        setSignupErrors({});
        setIsLoading(true);
        try {
            const capitalizeWord = (str) => {
                if (!str) return '';
                return str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
            };
            await customerApi.signup({
                firstName: capitalizeWord(firstName),
                lastName: capitalizeWord(lastName),
                phone: phone.trim(),
                email: email.trim() || undefined,
            });
            setShowOtp(true);
            setTimer(30);
            toast.success('Registration successful. OTP sent!');
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || 'Registration failed');
        } finally {
            setIsLoading(false);
        }
    };


    const handleVerifyOtp = async (e) => {
        e.preventDefault();
        if (formData.otp.length !== 4) {
            toast.error('Enter 4-digit code');
            return;
        }
        setIsLoading(true);
        try {
            const response = await customerApi.verifyOtp({ phone: formData.phone, otp: formData.otp });
            const { token, customer } = response.data.result;
            login({ ...customer, token, role: 'customer' });
            sessionStorage.removeItem('temp_login_phone');
            toast.success('Successfully Logged In!');
            navigate('/');
        } catch (error) {
            const apiMessage = error?.response?.data?.message;
            toast.error(apiMessage || 'Invalid OTP');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full relative flex items-center justify-center font-['Outfit',_sans-serif] overflow-y-auto py-8 sm:py-0">

            {/* Dynamic Atmospheric Background */}
            <div 
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat transition-all duration-1000"
                style={{ backgroundImage: `url(${BgImage})` }}
            >
                <motion.div
                    animate={{ backgroundColor: activeCategory.color }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-0 opacity-80 backdrop-blur-sm"
                />
            </div>

            {/* Animated Blurred Blobs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <motion.div
                    animate={{
                        backgroundColor: activeCategory.theme,
                        x: [0, 50, 0],
                        y: [0, 30, 0],
                        scale: [1, 1.2, 1]
                    }}
                    transition={{
                        backgroundColor: { duration: 1.5 },
                        x: { duration: 8, repeat: Infinity, ease: "easeInOut" },
                        y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
                        scale: { duration: 12, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute -top-24 -left-24 w-96 h-96 rounded-full blur-[100px] opacity-20"
                />
                <motion.div
                    animate={{
                        backgroundColor: activeCategory.theme,
                        x: [0, -40, 0],
                        y: [0, -60, 0],
                        scale: [1, 1.1, 1]
                    }}
                    transition={{
                        backgroundColor: { duration: 1.5 },
                        x: { duration: 9, repeat: Infinity, ease: "easeInOut" },
                        y: { duration: 7, repeat: Infinity, ease: "easeInOut" },
                        scale: { duration: 15, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="absolute -bottom-24 -right-24 w-[500px] h-[500px] rounded-full blur-[120px] opacity-30"
                />
            </div>

            {/* Premium Centered Card Container */}
            <div className="w-[92%] max-w-[400px] h-auto sm:h-[85vh] max-h-[780px] my-4 sm:my-0 bg-white relative z-10 overflow-hidden rounded-[40px] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] border border-white/40 flex flex-col transition-colors duration-1000">

                {/* Scrollable Content Container */}
                <div className="flex-1 min-h-0 overflow-y-auto pb-6 scrollbar-hide">

                    {/* Header: Immersive Category Visuals */}
                    <motion.div
                        animate={{ backgroundColor: activeCategory.theme }}
                        transition={{ duration: 1 }}
                        className="relative h-44 sm:h-52 w-full overflow-hidden shrink-0"
                    >


                        <AnimatePresence mode="wait">
                            <motion.div
                                key={carouselIndex}
                                initial={{ opacity: 0, scale: 1.1 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.05 }}
                                transition={{ duration: 0.8 }}
                                className="absolute inset-0"
                            >
                                <img
                                    src={activeCategory.img}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                    alt="banner"
                                />
                                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/10 to-transparent opacity-60" style={{ backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.4), rgba(0,0,0,0.1), ${activeCategory.theme})` }} />
                            </motion.div>
                        </AnimatePresence>

                        {/* Top Branding Bar */}
                        <div className="absolute top-8 left-0 w-full px-6 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-10 h-10 bg-white/20 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/30">
                                    <ShoppingBag size={20} className="text-white" />
                                </div>
                                <span className="text-white font-black tracking-tighter text-xl">{appName}</span>
                            </div>
                        </div>

                        {/* Centered App Message */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8 text-white pt-10">
                            <motion.h2
                                key={carouselIndex}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-2xl font-black tracking-tight leading-none mb-2"
                            >
                                {activeCategory.title.toUpperCase()} INSIDE
                            </motion.h2>
                            <p className="text-[10px] font-bold uppercase tracking-[4px] opacity-70">Everything delivered fast</p>
                        </div>

                        {/* S-Curve Divider */}
                        <div className="absolute -bottom-1 left-0 w-full leading-[0]">
                            <svg viewBox="0 0 1440 320" preserveAspectRatio="none" className="w-full h-24">
                                <path
                                    fill="#ffffff"
                                    d="M0,224L40,213.3C80,203,160,181,240,186.7C320,192,400,224,480,240C560,256,640,256,720,234.7C800,213,880,171,960,165.3C1040,160,1120,192,1200,208C1280,224,1360,224,1400,224L1440,224L1440,320L1400,320C1360,320,1280,320,1200,320C1120,320,1040,320,960,320C880,320,800,320,720,320C640,320,560,320,480,320C400,320,320,320,240,320C160,320,80,320,40,320L0,320Z"
                                />
                            </svg>
                        </div>
                    </motion.div>

                    {/* Circular Carousel Control */}
                    <div className="relative -mt-14 flex justify-center z-20">
                        <div className="w-28 h-28 rounded-full bg-white border-4 border-white shadow-[0_15px_40px_rgba(97,218,251,0.2)] flex items-center justify-center overflow-hidden transition-shadow duration-1000" style={{ boxShadow: `0 15px 40px ${activeCategory.shadow}` }}>
                            <AnimatePresence mode="wait">
                                    <motion.div
                                        key={carouselIndex}
                                        initial={{ opacity: 0, scale: 0.5, rotate: -20 }}
                                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                        exit={{ opacity: 0, scale: 1.5, rotate: 20 }}
                                        className="w-full h-full"
                                        style={{ color: activeCategory.text }}
                                    >
                                        {logoUrl ? (
                                            <img
                                                src={logoUrl}
                                                alt={`${appName} logo`}
                                                loading="lazy"
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: activeCategory.color }}>
                                                {activeCategory.icon}
                                            </div>
                                        )}
                                    </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>


                    {/* Authentication Form Block */}
                    <div className="px-6 pt-2 pb-10">
                        <AnimatePresence mode="wait">
                            {!showOtp ? (
                                <motion.div
                                    key="main-form"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-5"
                                >
                                    <div className="space-y-1 text-center">
                                        <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                            {isLogin ? 'Welcome to Canteen' : 'Create Account'}
                                        </h3>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-relaxed">
                                            {isLogin 
                                                ? 'Enter your registered phone number. Login OTP will be sent.' 
                                                : 'Fill details to register. Verification OTP will be sent.'}
                                        </p>
                                    </div>

                                    <form onSubmit={isLogin ? handleSendOtp : handleSignup} className="space-y-1.5">
                                        {!isLogin && (
                                            <>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors">
                                                            <User size={18} />
                                                        </div>
                                                        <input
                                                            required
                                                            name="firstName"
                                                            maxLength={20}
                                                            value={formData.firstName}
                                                            placeholder="First Name"
                                                            className={`w-full bg-gray-50 border rounded-2xl pl-10 pr-4 py-3 text-sm font-bold placeholder:text-xs placeholder:font-medium placeholder:text-gray-400 text-gray-800 outline-none focus:bg-white transition-all capitalize ${signupErrors.firstName ? 'border-red-400' : 'border-gray-100'}`}
                                                            onChange={(e) => { setFormData({ ...formData, firstName: e.target.value.replace(/[^a-zA-Z]/g, '') }); setSignupErrors(prev => ({ ...prev, firstName: '' })); }}
                                                            onFocus={(e) => {
                                                                e.target.style.borderColor = signupErrors.firstName ? '#f87171' : activeCategory.theme;
                                                                handleInputFocus(e);
                                                            }}
                                                            onBlur={(e) => e.target.style.borderColor = signupErrors.firstName ? '#f87171' : '#F3F4F6'}
                                                        />
                                                        {signupErrors.firstName && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{signupErrors.firstName}</p>}
                                                    </div>
                                                    <div className="relative group">
                                                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors">
                                                            <User size={18} />
                                                        </div>
                                                        <input
                                                            required
                                                            name="lastName"
                                                            maxLength={20}
                                                            value={formData.lastName}
                                                            placeholder="Last Name"
                                                            className={`w-full bg-gray-50 border rounded-2xl pl-10 pr-4 py-3 text-sm font-bold placeholder:text-xs placeholder:font-medium placeholder:text-gray-400 text-gray-800 outline-none focus:bg-white transition-all capitalize ${signupErrors.lastName ? 'border-red-400' : 'border-gray-100'}`}
                                                            onChange={(e) => { setFormData({ ...formData, lastName: e.target.value.replace(/[^a-zA-Z]/g, '') }); setSignupErrors(prev => ({ ...prev, lastName: '' })); }}
                                                            onFocus={(e) => {
                                                                e.target.style.borderColor = signupErrors.lastName ? '#f87171' : activeCategory.theme;
                                                                handleInputFocus(e);
                                                            }}
                                                            onBlur={(e) => e.target.style.borderColor = signupErrors.lastName ? '#f87171' : '#F3F4F6'}
                                                        />
                                                        {signupErrors.lastName && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{signupErrors.lastName}</p>}
                                                    </div>
                                                </div>

                                                <div className="relative group">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors">
                                                        <Mail size={18} />
                                                    </div>
                                                    <input
                                                        type="email"
                                                        name="email"
                                                        value={formData.email}
                                                        placeholder="Email Address (Optional)"
                                                        className={`w-full bg-gray-50 border rounded-2xl pl-10 pr-4 py-3 text-sm font-bold placeholder:text-xs placeholder:font-medium placeholder:text-gray-400 text-gray-800 outline-none focus:bg-white transition-all ${signupErrors.email ? 'border-red-400' : 'border-gray-100'}`}
                                                        onChange={(e) => { setFormData({ ...formData, email: e.target.value }); setSignupErrors(prev => ({ ...prev, email: '' })); }}
                                                        onFocus={(e) => {
                                                            e.target.style.borderColor = signupErrors.email ? '#f87171' : activeCategory.theme;
                                                            handleInputFocus(e);
                                                        }}
                                                        onBlur={(e) => e.target.style.borderColor = signupErrors.email ? '#f87171' : '#F3F4F6'}
                                                    />
                                                    {signupErrors.email && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{signupErrors.email}</p>}
                                                </div>

                                            </>
                                        )}
                                        <div className="relative group">
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 transition-colors">
                                                <Phone size={18} />
                                            </div>
                                            <div className="absolute left-11 top-1/2 -translate-y-1/2 font-black text-sm text-gray-400 border-r border-gray-200 pr-2">
                                                +91
                                            </div>
                                            <input
                                                required
                                                name="phone"
                                                maxLength={10}
                                                value={formData.phone}
                                                placeholder="Mobile Number"
                                                className={`w-full bg-gray-50 border rounded-2xl pl-20 pr-4 py-3 text-sm font-bold placeholder:text-xs placeholder:font-medium placeholder:text-gray-400 text-gray-800 outline-none focus:bg-white transition-all ${signupErrors.phone ? 'border-red-400' : 'border-gray-100'}`}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '');
                                                    setFormData(prev => ({ ...prev, phone: val }));
                                                    sessionStorage.setItem('temp_login_phone', val);
                                                    setSignupErrors(prev => ({ ...prev, phone: '' }));
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = signupErrors.phone ? '#f87171' : activeCategory.theme;
                                                    handleInputFocus(e);
                                                }}
                                                onBlur={(e) => e.target.style.borderColor = signupErrors.phone ? '#f87171' : '#F3F4F6'}
                                            />
                                            {signupErrors.phone && <p className="text-[10px] text-red-500 font-bold mt-1 ml-1">{signupErrors.phone}</p>}
                                        </div>



                                        <button
                                            type="submit"
                                            disabled={isLoading}
                                            className="w-full text-white py-4 rounded-[24px] text-xs font-black tracking-[4px] flex items-center justify-center gap-3 active:scale-95 transition-all uppercase"
                                            style={{ backgroundColor: activeCategory.theme, boxShadow: `0 20px 40px ${activeCategory.shadow}` }}
                                        >
                                            {isLoading ? 'Verifying...' : 'Continue'}
                                            <ChevronRight size={18} />
                                        </button>
                                    </form>

                                    <div className="text-center pt-2">
                                        <button
                                            type="button"
                                            onClick={() => navigate(isLogin ? '/signup' : '/login')}
                                            className="text-xs font-bold uppercase tracking-wider transition-colors hover:opacity-80"
                                            style={{ color: activeCategory.theme }}
                                        >
                                            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Log In"}
                                        </button>
                                    </div>

                                    {/* Legal Agreement Footer */}
                                    <div className="!-mt-1 flex flex-col items-center gap-1">
                                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest text-center">
                                            By continuing, you agree to our
                                        </p>
                                        <div className="flex items-center gap-1.5 underline decoration-gray-200 underline-offset-4">
                                            <button 
                                                onClick={() => navigate('/terms')}
                                                className="text-[10px] font-black uppercase tracking-widest hover:text-gray-900 transition-colors"
                                                style={{ color: activeCategory.theme }}
                                            >
                                                Terms & Condition
                                            </button>
                                            <span className="text-[8px] text-gray-300">•</span>
                                            <button 
                                                onClick={() => navigate('/privacy')}
                                                className="text-[10px] font-black uppercase tracking-widest hover:text-gray-900 transition-colors"
                                                style={{ color: activeCategory.theme }}
                                            >
                                                Privacy Policy
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="otp-view"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="space-y-10"
                                >
                                    <div className="flex items-center gap-4">
                                        <button
                                            onClick={() => setShowOtp(false)}
                                            className="w-10 h-10 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center text-gray-400"
                                        >
                                            <ChevronLeft size={20} />
                                        </button>
                                        <div>
                                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                                {isLogin ? 'Verify Device' : 'OTP Verification'}
                                            </h3>
                                            <p className="text-[10px] font-black tracking-widest text-gray-400 uppercase">+91 {formData.phone}</p>
                                        </div>
                                    </div>

                                    <form onSubmit={handleVerifyOtp} className="space-y-10">
                                        <div className="relative flex justify-between gap-3 px-1">
                                            {/* Hidden input overlaying the boxes */}
                                            <input
                                                type="tel"
                                                pattern="\d*"
                                                maxLength={4}
                                                value={formData.otp}
                                                onChange={(e) => {
                                                    const val = e.target.value.replace(/\D/g, '').substring(0, 4);
                                                    setFormData({ ...formData, otp: val });
                                                }}
                                                onFocus={() => setOtpFocused(true)}
                                                onBlur={() => setOtpFocused(false)}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-text z-20"
                                                autoFocus
                                            />
                                            
                                            {/* 4 visual boxes */}
                                            {[...Array(4)].map((_, i) => {
                                                const char = formData.otp[i] || "";
                                                const isFocused = otpFocused && (formData.otp.length === i || (formData.otp.length === 4 && i === 3));
                                                
                                                return (
                                                    <div
                                                        key={i}
                                                        className={cn(
                                                            "w-14 h-16 bg-white border-2 rounded-3xl flex items-center justify-center text-2xl font-black shadow-[0_18px_45px_rgba(15,23,42,0.15)] transition-all select-none pointer-events-none",
                                                            isFocused ? "shadow-[0_24px_65px_rgba(15,23,42,0.35)]" : "border-gray-200"
                                                        )}
                                                        style={{ 
                                                            color: activeCategory.theme,
                                                            borderColor: isFocused ? activeCategory.theme : undefined
                                                        }}
                                                    >
                                                        {char}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <div className="space-y-4">
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="w-full bg-gray-900 text-white py-4 rounded-[24px] text-xs font-black tracking-[4px] shadow-2xl flex items-center justify-center gap-3 uppercase active:scale-95 transition-all"
                                            >
                                                {isLoading ? 'Authenticating...' : <>welcome <span className="normal-case">{appName}</span></>}
                                            </button>
                                            <div className="flex justify-center">
                                                <button
                                                    type="button"
                                                    disabled={timer > 0}
                                                    onClick={handleSendOtp}
                                                    className={`text-[10px] font-black uppercase tracking-widest ${timer > 0 ? 'text-gray-300' : 'underline'}`}
                                                    style={{ color: timer > 0 ? undefined : activeCategory.theme }}
                                                >
                                                    {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Now'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>

            {/* Desktop Message */}
            <div className="hidden md:block absolute bottom-10 right-10 text-white/20 text-xs font-bold uppercase tracking-[4px]">
                Adaptive Theme Simulator
            </div>
        </div>
    );
};

export default CustomerAuth;


