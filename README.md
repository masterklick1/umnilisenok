# Smart Fox Learning

// Инициализация VK SDK с вашим App ID
<script>
// Добавьте этот код в Lovable в раздел скриптов или в главный компонент

// Ждем загрузки VK SDK
window.vkAsyncInit = function() {
  VK.init({
    apiId: 54330496, // ВАШ APP_ID
    onlyWidgets: false
  });
  
  console.log('VK SDK initialized with appId: 54330496');
  
  // Проверяем авторизацию
  VK.Auth.getLoginStatus(function(response) {
    console.log('Login status:', response);
    if (response.status === 'connected') {
      // Пользователь авторизован
      console.log('User is authorized', response);
      loadUserData(response.session.user.id);
    } else {
      // Пользователь не авторизован - показываем кнопку входа
      console.log('User is not authorized');
      showLoginButton();
    }
  });
};

// Загружаем VK SDK асинхронно
(function() {
  var el = document.createElement("script");
  el.type = "text/javascript";
  el.src = "https://vk.com/js/api/openapi.js?169";
  el.async = true;
  document.getElementById("vk_api_transport").appendChild(el);
}());

// Функция для загрузки данных пользователя
function loadUserData(userId) {
  VK.Api.call('users.get', { 
    user_ids: userId, 
    fields: 'photo_100,first_name,last_name,sex' 
  }, function(r) {
    if (r.response) {
      const user = r.response[0];
      console.log('User data loaded:', user);
      
      // Сохраняем данные пользователя
      localStorage.setItem('vk_user', JSON.stringify(user));
      localStorage.setItem('vk_user_id', userId);
      
      // Показываем приветствие
      showWelcomeMessage(user.first_name, user.photo_100);
      
      // Загружаем приложение
      initializeApp();
    }
  });
}

// Функция для показа кнопки входа
function showLoginButton() {
  const authSection = document.getElementById('auth-section');
  if (!authSection) return;
  
  authSection.innerHTML = `
    <div style="text-align: center; padding: 20px;">
      <h3>Добро пожаловать в "Умного Лисёнка"! 🦊</h3>
      <p>Войдите через VK чтобы начать обучение</p>
      <button onclick="VK.Auth.login(authCallback, 4);" 
              style="padding: 12px 24px; background: #4A76A8; color: white; 
                     border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
        Войти через VK
      </button>
    </div>
  `;
}

// Колбэк после авторизации
function authCallback(response) {
  console.log('Auth callback:', response);
  if (response.session) {
    console.log('Authorization successful');
    // Перезагружаем страницу для применения авторизации
    setTimeout(() => {
      location.reload();
    }, 500);
  } else {
    console.log('Authorization failed or canceled');
    alert('Для работы приложения нужна авторизация через VK');
  }
}

// Функция для показа приветствия
function showWelcomeMessage(firstName, photoUrl) {
  const welcomeDiv = document.getElementById('user-welcome');
  if (!welcomeDiv) return;
  
  welcomeDiv.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px; padding: 10px; background: #f0f8ff; border-radius: 10px;">
      <img src="${photoUrl}" style="width: 50px; height: 50px; border-radius: 50%; border: 2px solid #FF6B35;">
      <div>
        <div style="font-weight: bold; color: #2D3047;">Привет, ${firstName}! 🦊</div>
        <div style="font-size: 12px; color: #666;">Готов учиться с Умным Лисёнком?</div>
      </div>
    </div>
  `;
}

// Инициализация основного приложения после авторизации
function initializeApp() {
  console.log('Initializing main application...');
  
  // Проверяем, есть ли сохраненные данные пользователя
  const savedUser = localStorage.getItem('vk_user');
  if (savedUser) {
    const user = JSON.parse(savedUser);
    console.log('Restored user from storage:', user);
    
    // Показываем главный экран приложения
    showMainApp();
  }
}

// Функция для показа главного экрана приложения
function showMainApp() {
  const appContainer = document.getElementById('app-container');
  if (!appContainer) return;
  
  appContainer.innerHTML = `
    <div style="padding: 20px;">
      <h1 style="color: #FF6B35; text-align: center;">🦊 Умный Лисёнок</h1>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px;">
        <div class="subject-card" onclick="openSubject('math')">
          🔢 Математика
        </div>
        <div class="subject-card" onclick="openSubject('alphabet')">
          📚 Алфавит
        </div>
        <div class="subject-card" onclick="openSubject('world')">
          🌍 Окружающий мир
        </div>
        <div class="subject-card" onclick="openSubject('creative')">
          🎨 Творчество
        </div>
      </div>
      
      <div style="margin-top: 30px; text-align: center;">
        <button onclick="openAIChat()" style="padding: 10px 20px; background: #4ECDC4; color: white; border: none; border-radius: 8px;">
          Поговорить с ИИ-учителем
        </button>
      </div>
    </div>
  `;
}

// Временные функции для навигации (заглушки)
function openSubject(subject) {
  alert(`Открываем раздел: ${subject} (функция в разработке)`);
}

function openAIChat() {
  alert(`Открываем чат с ИИ-учителем (функция в разработке)`);
}

// Проверяем авторизацию при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, checking VK auth...');
  
  // Создаем необходимые HTML элементы если их нет
  if (!document.getElementById('vk_api_transport')) {
    const vkTransport = document.createElement('div');
    vkTransport.id = 'vk_api_transport';
    document.body.appendChild(vkTransport);
  }
  
  if (!document.getElementById('auth-section')) {
    const authSection = document.createElement('div');
    authSection.id = 'auth-section';
    document.body.appendChild(authSection);
  }
  
  if (!document.getElementById('user-welcome')) {
    const userWelcome = document.createElement('div');
    userWelcome.id = 'user-welcome';
    document.body.appendChild(userWelcome);
  }
  
  if (!document.getElementById('app-container')) {
    const appContainer = document.createElement('div');
    appContainer.id = 'app-container';
    document.body.appendChild(appContainer);
  }
  
  // Добавляем базовые стили
  const style = document.createElement('style');
  style.textContent = `
    .subject-card {
      padding: 20px;
      background: white;
      border: 2px solid #FF6B35;
      border-radius: 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
    }
    .subject-card:hover {
      background: #FFF0E6;
      transform: translateY(-2px);
    }
  `;
  document.head.appendChild(style);
});
</script>

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://umnilisenok.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/86978e2a-f29e-4522-8874-3ecba72c9930).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
