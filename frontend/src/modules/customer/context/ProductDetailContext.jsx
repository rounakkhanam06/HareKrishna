import React, { createContext, useContext, useState, useMemo, useEffect, useRef, useCallback } from 'react';

const ProductDetailContext = createContext();

export const useProductDetail = () => {
    const context = useContext(ProductDetailContext);
    if (!context) {
        return {};
    }
    return context;
};

export const ProductDetailProvider = ({ children }) => {
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    // Whether we pushed a dummy history state for the sheet
    const pushedState = useRef(false);
    // Whether the close was triggered by the back button (so we don't call history.back() again)
    const closedByBack = useRef(false);

    const closeProduct = useCallback(() => {
        setIsOpen(false);
        setTimeout(() => setSelectedProduct(null), 300);
    }, []);

    const openProduct = useCallback((product) => {
        setSelectedProduct(product);
        setIsOpen(true);
        // Push a dummy history entry so the browser back button can close the sheet
        if (!pushedState.current) {
            window.history.pushState({ productSheet: true }, '');
            pushedState.current = true;
        }
    }, []);

    // Hardware / browser back button: popstate fires when the dummy state is popped
    useEffect(() => {
        const handlePopState = () => {
            if (isOpen && pushedState.current) {
                // Back was pressed while sheet is open — close the sheet
                closedByBack.current = true;
                pushedState.current = false;
                closeProduct();
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [isOpen, closeProduct]);

    // If the sheet was closed by the X button (not by back), clean up the dummy history entry
    useEffect(() => {
        if (!isOpen && pushedState.current && !closedByBack.current) {
            // Sheet closed normally (not via back button) — pop our dummy state
            pushedState.current = false;
            window.history.back();
        }
        // Reset the closedByBack flag
        if (!isOpen) {
            closedByBack.current = false;
        }
    }, [isOpen]);

    const value = useMemo(
        () => ({ selectedProduct, isOpen, openProduct, closeProduct }),
        [selectedProduct, isOpen, openProduct, closeProduct]
    );

    return (
        <ProductDetailContext.Provider value={value}>
            {children}
        </ProductDetailContext.Provider>
    );
};
