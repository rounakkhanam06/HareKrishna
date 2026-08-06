import React from 'react';
import { cn } from '@/lib/utils';

export const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={cn("animate-pulse rounded-md bg-slate-200/80 dark:bg-slate-800/80", className)}
            {...props}
        />
    );
};

export const SkeletonPage = ({ type = 'default' }) => {
    // If delivery path is active, render delivery-like layout, else customer layout
    const isDelivery = window.location.pathname.startsWith('/delivery');

    if (isDelivery) {
        return (
            <div className="min-h-screen bg-slate-50 p-4 space-y-6 animate-pulse">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32 rounded-lg" />
                        <Skeleton className="h-4 w-48 rounded-md" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                </div>

                {/* Status Toggle Card */}
                <Skeleton className="h-16 w-full rounded-2xl" />

                {/* Earnings Summary Card */}
                <Skeleton className="h-32 w-full rounded-2xl" />

                {/* Active Orders Section */}
                <div className="space-y-4">
                    <Skeleton className="h-5 w-28 rounded-md" />
                    {[1, 2].map((i) => (
                        <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 space-y-3">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-5 w-24 rounded-md" />
                                <Skeleton className="h-5 w-16 rounded-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full rounded-md" />
                                <Skeleton className="h-4 w-2/3 rounded-md" />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Skeleton className="h-9 flex-1 rounded-xl" />
                                <Skeleton className="h-9 flex-1 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // Customer App Layout
    return (
        <div className="min-h-screen bg-slate-50 space-y-6 pb-20 animate-pulse">
            {/* Top Bar / Search bar */}
            <div className="bg-white px-4 py-4 space-y-3 shadow-sm border-b border-slate-100">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-full" />
                        <Skeleton className="h-4 w-36 rounded-md" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-full" />
                </div>
                <Skeleton className="h-10 w-full rounded-xl" />
            </div>

            {/* Banner/Hero Slider */}
            <div className="px-4">
                <Skeleton className="h-40 w-full rounded-2xl" />
            </div>

            {/* Category horizontal list */}
            <div className="px-4 space-y-3">
                <div className="flex justify-between">
                    <Skeleton className="h-5 w-24 rounded-md" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                <div className="flex gap-4 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <Skeleton className="h-14 w-14 rounded-full" />
                            <Skeleton className="h-3 w-10 rounded-md" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Product Feed Grid */}
            <div className="px-4 space-y-3">
                <div className="flex justify-between">
                    <Skeleton className="h-5 w-28 rounded-md" />
                    <Skeleton className="h-4 w-12 rounded-md" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 space-y-3">
                            <Skeleton className="h-32 w-full rounded-xl" />
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-5/6 rounded-md" />
                                <Skeleton className="h-3 w-2/3 rounded-md" />
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <Skeleton className="h-5 w-12 rounded-md" />
                                <Skeleton className="h-8 w-16 rounded-lg" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Bottom Nav */}
            <div className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-100 h-16 flex items-center justify-around px-4">
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-8 w-8 rounded-full" />
                ))}
            </div>
        </div>
    );
};

export default SkeletonPage;
