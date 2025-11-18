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
    let timeoutId: NodeJS.Timeout;
    let initAttempts = 0;
    const MAX_ATTEMPTS = 20;

    // Set a safety timeout to prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      console.log('VK initialization timeout - showing login screen');
      setIsLoading(false);
    }, 5000);

    // Initialize VK SDK
    const initVK = () => {
      initAttempts++;
      
      if (initAttempts > MAX_ATTEMPTS) {
        console.log('Max VK init attempts reached - showing login screen');
        clearTimeout(safetyTimeout);
        setIsLoading(false);
        return;
      }

      if (typeof window.VK !== 'undefined') {
        try {
          window.VK.init({
            apiId: VK_APP_ID,
            onlyWidgets: false
          });

          console.log('VK SDK initialized successfully');

          // Check login status with error handling
          try {
            window.VK.Auth.getLoginStatus((response: any) => {
              clearTimeout(safetyTimeout);
              console.log('Login status response:', response);
              
              if (response && response.status === 'connected') {
                console.log('User is connected, loading data...');
                loadUserData(response.session.user.id);
              } else {
                console.log('User not connected, showing login screen');
                setIsLoading(false);
              }
            });
          } catch (error) {
            console.error('Error checking login status:', error);
            clearTimeout(safetyTimeout);
            setIsLoading(false);
          }
        } catch (error) {
          console.error('Error initializing VK SDK:', error);
          clearTimeout(safetyTimeout);
          setIsLoading(false);
        }
      } else {
        console.log(`VK SDK not loaded yet, attempt ${initAttempts}/${MAX_ATTEMPTS}`);
        timeoutId = setTimeout(initVK, 100);
      }
    };

    initVK();

    return () => {
      clearTimeout(timeoutId);
      clearTimeout(safetyTimeout);
    };
  }, []);

  const loadUserData = (userId: number) => {
    try {
      window.VK.Api.call('users.get', {
        user_ids: userId,
        fields: 'photo_100,first_name,last_name,sex'
      }, (r: any) => {
        if (r.response && r.response[0]) {
          const userData = r.response[0];
          console.log('User data loaded successfully:', userData);
          setUser(userData);
          localStorage.setItem('vk_user', JSON.stringify(userData));
        } else {
          console.error('Failed to load user data:', r);
        }
        setIsLoading(false);
      });
    } catch (error) {
      console.error('Error loading user data:', error);
      setIsLoading(false);
    }
  };

  const login = () => {
    try {
      if (typeof window.VK === 'undefined') {
        console.error('VK SDK not loaded');
        alert('VK SDK не загружен. Пожалуйста, перезагрузите страницу.');
        return;
      }

      window.VK.Auth.login((response: any) => {
        console.log('Auth response:', response);
        if (response && response.session) {
          console.log('Login successful');
          loadUserData(response.session.user.id);
        } else {
          console.log('Authorization failed or canceled by user');
        }
      }, 4); // Permission for basic info
    } catch (error) {
      console.error('Error during login:', error);
      alert('Ошибка при входе. Пожалуйста, попробуйте снова.');
    }
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
