import React, { createContext, useContext, useState, useEffect } from 'react';

interface VKUser {
  id: number;
  first_name: string;
  last_name: string;
  photo_100?: string;
  sex?: number;
}

interface VKAuthContextType {
  user: VKUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => void;
  logout: () => void;
}

const VKAuthContext = createContext<VKAuthContextType | undefined>(undefined);

const VK_APP_ID = 54330496;

export const VKAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<VKUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize VK SDK
    const initVK = () => {
      if (typeof window.VK !== 'undefined') {
        window.VK.init({
          apiId: VK_APP_ID,
          onlyWidgets: false
        });

        console.log('VK SDK initialized');

        // Check login status
        window.VK.Auth.getLoginStatus((response: any) => {
          console.log('Login status:', response);
          if (response.status === 'connected') {
            loadUserData(response.session.user.id);
          } else {
            setIsLoading(false);
          }
        });
      } else {
        console.log('VK SDK not loaded yet, retrying...');
        setTimeout(initVK, 100);
      }
    };

    initVK();
  }, []);

  const loadUserData = (userId: number) => {
    window.VK.Api.call('users.get', {
      user_ids: userId,
      fields: 'photo_100,first_name,last_name,sex'
    }, (r: any) => {
      if (r.response) {
        const userData = r.response[0];
        console.log('User data loaded:', userData);
        setUser(userData);
        localStorage.setItem('vk_user', JSON.stringify(userData));
      }
      setIsLoading(false);
    });
  };

  const login = () => {
    window.VK.Auth.login((response: any) => {
      console.log('Auth response:', response);
      if (response.session) {
        loadUserData(response.session.user.id);
      } else {
        console.log('Authorization failed or canceled');
      }
    }, 4); // Permission for basic info
  };

  const logout = () => {
    window.VK.Auth.logout(() => {
      setUser(null);
      localStorage.removeItem('vk_user');
      console.log('User logged out');
    });
  };

  return (
    <VKAuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </VKAuthContext.Provider>
  );
};

export const useVKAuth = () => {
  const context = useContext(VKAuthContext);
  if (context === undefined) {
    throw new Error('useVKAuth must be used within a VKAuthProvider');
  }
  return context;
};

// Type declaration for VK
declare global {
  interface Window {
    VK: any;
    vkAsyncInit: () => void;
  }
}
