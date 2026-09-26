import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { CustomerUIProvider } from './context/CustomerUIContext';
import { FavoritesProvider } from './context/FavoritesContext';
import { SocketProvider } from './context/SocketContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <SocketProvider>
            <CartProvider>
              <CustomerUIProvider>
                <FavoritesProvider>
                  <AppRoutes />
                </FavoritesProvider>
              </CustomerUIProvider>
            </CartProvider>
          </SocketProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
