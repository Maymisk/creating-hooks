import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
    children: ReactNode;
}

interface UpdateProductAmount {
    productId: number;
    amount: number;
}

interface CartContextData {
    cart: Product[];
    addProduct: (productId: number) => Promise<void>;
    removeProduct: (productId: number) => void;
    updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
    const [cart, setCart] = useState<Product[]>(() => {
        const storagedCart = localStorage.getItem('@RocketShoes:cart');

        if (storagedCart) {
            return JSON.parse(storagedCart);
        }

        return [];
    });

    const addProduct = async (productId: number) => {
        try {
            const tmp = [...cart];
            const product = tmp.find(product => product.id === productId);

            const productStock = (await api.get<Stock>(`stock/${productId}`))
                .data;

            const currentProductAmount = product ? product.amount : 0;

            if (currentProductAmount + 1 > productStock.amount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            if (product) {
                product.amount += 1;
            } else {
                const product = (
                    await api.get<Product>(`products/${productId}`)
                ).data;

                product.amount = 1;

                tmp.push(product);
            }

            setCart(tmp);
            localStorage.setItem('@RocketShoes:cart', JSON.stringify(tmp));
        } catch {
            toast.error('Erro na adição do produto');
        }
    };

    const removeProduct = (productId: number) => {
        try {
            const tmp = [...cart];

            const productIndex = tmp.findIndex(
                product => product.id === productId
            );

            if (productIndex >= 0) {
                tmp.splice(productIndex, 1);
                setCart(tmp);
                localStorage.setItem('@RocketShoes:cart', JSON.stringify(tmp));
            } else {
                throw new Error();
            }
        } catch {
            toast.error('Erro na remoção do produto');
        }
    };

    const updateProductAmount = async ({
        productId,
        amount
    }: UpdateProductAmount) => {
        try {
            if (amount <= 0) {
                return;
            }

            const productStock = (await api.get<Stock>(`stock/${productId}`))
                .data;

            if (amount > productStock.amount) {
                toast.error('Quantidade solicitada fora de estoque');
                return;
            }

            const tmp = [...cart];

            const product = tmp.find(product => product.id === productId);

            if (product) {
                product.amount = amount;
                setCart(tmp);
                localStorage.setItem('@RocketShoes:cart', JSON.stringify(tmp));
                return;
            }

            throw new Error();
        } catch {
            toast.error('Erro na alteração de quantidade do produto');
        }
    };

    return (
        <CartContext.Provider
            value={{ cart, addProduct, removeProduct, updateProductAmount }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart(): CartContextData {
    return useContext(CartContext);
}
