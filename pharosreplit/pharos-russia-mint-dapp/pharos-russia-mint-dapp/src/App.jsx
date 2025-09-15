import { useEffect, useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x513b4C3e12D99E6Ed487a31BAfCC52D8f842A857";
const ABI = [
  "function mint() public payable",
  "function totalSupply() public view returns (uint256)",
  "function maxSupply() public view returns (uint256)"
];

// Pharos Testnet Network Config (как в официальном приложении)
const PHAROS_NETWORK = {
  chainId: '0xA8230', // 688688 в hex
  chainName: 'Pharos Testnet',
  rpcUrls: ['https://pharos-testnet-rpc.altlayer.io'],
  nativeCurrency: {
    name: 'PHAR',
    symbol: 'PHAR',
    decimals: 18
  },
  blockExplorerUrls: ['https://testnet.pharosnetwork.xyz/']
};

export default function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);
  const [supply, setSupply] = useState(0);
  const [maxSupply, setMaxSupply] = useState(10000);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  // Проверяем подключение при загрузке
  useEffect(() => {
    checkConnection();
  }, []);

  // Загружаем данные контракта при подключении
  useEffect(() => {
    if (contract) {
      loadContractData();
    }
  }, [contract]);

  const checkConnection = async () => {
    if (window.ethereum && window.ethereum.selectedAddress) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
        
        setProvider(provider);
        setSigner(signer);
        setAccount(address);
        setContract(contract);
        
        console.log("Кошелек уже подключен:", address);
      } catch (err) {
        console.log("Автоподключение не удалось:", err.message);
      }
    }
  };

  const connectWallet = async () => {
    if (connecting) return;
    
    setConnecting(true);
    setError('');
    
    try {
      console.log("Проверяем наличие кошелька...");
      console.log("window.ethereum:", typeof window.ethereum);
      console.log("window:", Object.keys(window));
      
      // Ждем немного для полной загрузки
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Проверяем наличие Ethereum провайдера
      if (typeof window.ethereum === 'undefined') {
        // В Replit iframe кошелек может быть недоступен
        alert('⚠️ В Replit браузере кошелек может быть недоступен.\n\nДля полноценного тестирования:\n1. Откройте приложение в новой вкладке\n2. Убедитесь что установлен MetaMask/OKX\n3. Разрешите доступ к сайту');
        throw new Error('Ethereum кошелек не найден. Пожалуйста, установите MetaMask, OKX Wallet или другой EVM кошелек.');
      }

      console.log("Кошелек найден! Запрашиваем подключение...");
      
      // Запрашиваем подключение
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      console.log("Получены аккаунты:", accounts);
      
      // Проверяем и добавляем/переключаемся на Pharos Testnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: PHAROS_NETWORK.chainId }],
        });
        console.log("Переключились на Pharos Testnet");
      } catch (switchError) {
        // Если сеть не добавлена, добавляем её
        if (switchError.code === 4902) {
          console.log("Добавляем Pharos Testnet в кошелек...");
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [PHAROS_NETWORK]
          });
          console.log("Pharos Testnet добавлен!");
        } else {
          throw switchError;
        }
      }
      
      // Создаем провайдер и контракт
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);

      // Проверяем что мы на правильной сети
      const network = await provider.getNetwork();
      if (network.chainId !== 688688n) {
        throw new Error('Пожалуйста, переключитесь на Pharos Testnet в вашем кошельке');
      }

      setProvider(provider);
      setSigner(signer);
      setAccount(address);
      setContract(contract);
      
      console.log("Кошелек успешно подключен:", address);
      console.log("Сеть:", network.name, "Chain ID:", network.chainId.toString());
      
    } catch (err) {
      console.error("Ошибка подключения:", err);
      console.error("Тип ошибки:", typeof err);
      console.error("Код ошибки:", err.code);
      console.error("Сообщение ошибки:", err.message);
      
      if (err.code === 4001) {
        setError('Подключение отклонено пользователем');
      } else if (err.message && err.message.includes('User rejected')) {
        setError('Подключение отклонено пользователем');
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Ошибка подключения к кошельку. Убедитесь что кошелек установлен.');
      }
    } finally {
      setConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setContract(null);
    setError('');
    console.log("Кошелек отключен");
  };

  const loadContractData = async () => {
    if (!contract) return;
    
    try {
      const [currentSupply, maxSupplyValue] = await Promise.all([
        contract.totalSupply(),
        contract.maxSupply()
      ]);
      
      setSupply(Number(currentSupply));
      setMaxSupply(Number(maxSupplyValue));
      
      console.log("Данные контракта загружены:", {
        supply: Number(currentSupply),
        maxSupply: Number(maxSupplyValue)
      });
    } catch (err) {
      console.error("Ошибка загрузки данных контракта:", err);
    }
  };

  const mintNFT = async () => {
    if (!contract) return;
    
    try {
      console.log("Начинаем минт NFT...");
      
      // Проверяем баланс пользователя
      const balance = await provider.getBalance(account);
      console.log("Баланс пользователя:", ethers.formatEther(balance), "PHRS");
      
  // Отправляем транзакцию без оплаты (только газ)
      const tx = await contract.mint({
        value: ethers.parseUnits("1", 18) // 1 PHRS за минт
      });
      console.log("Транзакция отправлена:", tx.hash);
      
      // Ждем подтверждения
      console.log("Ждем подтверждения транзакции...");
      const receipt = await tx.wait();
      console.log("Транзакция подтверждена:", receipt);
      
      // Обновляем данные
      await loadContractData();
      
      alert(`NFT успешно заминчен! Хэш транзакции: ${tx.hash}`);
    } catch (err) {
      console.error("Ошибка минта:", err);
      console.error("Детали ошибки:", {
        message: err.message,
        reason: err.reason,
        code: err.code,
        data: err.data
      });
      
      if (err.code === 4001) {
        alert('Минт отклонен пользователем');
      } else if (err.message && err.message.includes('insufficient funds')) {
        alert('Недостаточно PHRS для минта.\nНужно: 1 PHRS + газ\nПолучите тестовые PHRS из крана Pharos.');
      } else if (err.reason) {
        alert(`Ошибка смарт-контракта: ${err.reason}`);
      } else if (err.message && err.message.includes('CALL_EXCEPTION')) {
        alert('Ошибка вызова контракта.\nВозможно:\n• Контракт приостановлен\n• Достигнут лимит минтов\n• Нужна оплата за минт\n\nПопробуйте позже или обратитесь к разработчикам.');
      } else {
        alert(`Ошибка минта: ${err.message || 'Неизвестная ошибка'}`);
      }
    }
  };

  // Обработчики событий кошелька
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else if (accounts[0] !== account) {
          checkConnection();
        }
      };

      const handleChainChanged = () => {
        // Перезагружаем страницу при смене сети для стабильности
        window.location.reload();
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [account]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black text-white flex flex-col">
      {/* Фоновое изображение */}
      <div className="absolute inset-0 opacity-20">
        <img 
          src="/PharosRussia.jpg" 
          alt="Pharos Russia Background" 
          className="w-full h-full object-cover"
        />
      </div>
      
      <div className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-black/20 backdrop-blur-lg rounded-3xl p-8 border border-white/10 shadow-2xl">
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-yellow-400 to-red-600 bg-clip-text text-transparent">
              Pharos Russia NFT
            </h1>
            <p className="text-gray-300 mb-4 text-sm">
              Минт русский NFT-значок на Pharos Testnet<br/>
            <span className="text-yellow-400">Бесплатно (только газ)</span>
            </p>
            
            {/* NFT Preview */}
            <div className="mb-6 p-4 bg-white/5 rounded-2xl border border-white/10">
              <img 
                src="/PharosRossia.png" 
                alt="Pharos Russia NFT" 
                className="w-32 h-32 mx-auto rounded-2xl shadow-lg"
              />
              <p className="text-xs text-gray-400 mt-2">Pharos Russia NFT</p>
            </div>

          <div className="bg-white/5 rounded-2xl p-6 mb-6 border border-white/10">
            <div className="flex justify-between items-center mb-4">
              <span className="text-gray-400">Заминчено:</span>
              <span className="font-bold text-xl">{supply} / {maxSupply}</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-3 mb-4">
              <div 
                className="bg-gradient-to-r from-yellow-400 to-red-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${(supply / maxSupply) * 100}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-400">
              Pharos Testnet • Бесплатный минт (только газ)
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4">
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {account ? (
            <div className="space-y-4">
              <button
                onClick={mintNFT}
                className="w-full bg-gradient-to-r from-yellow-500 to-red-600 hover:from-yellow-600 hover:to-red-700 px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Минт NFT 🎨
              </button>
              <button
                onClick={disconnectWallet}
                className="w-full bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-xl text-sm transition-all duration-200"
              >
                Отключить кошелёк
              </button>
              <p className="mt-3 text-xs break-all text-gray-400">
                Подключен: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            </div>
          ) : (
            <button
              onClick={connectWallet}
              disabled={connecting}
              className={`w-full px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg ${
                connecting 
                  ? "bg-gray-500 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 hover:shadow-xl"
              }`}
            >
              {connecting ? "Подключение..." : "Подключить кошелёк"}
            </button>
          )}
          
          {/* Кнопка подписки на Telegram */}
          <div className="mt-4">
            <a 
              href="https://t.me/hrumdrops" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              📱 Русскоговорящее сообщество Pharos
            </a>
            <p className="text-xs text-gray-400 mt-1 text-center">
              Присоединяйтесь к нашему Telegram каналу
            </p>
          </div>
          
          <div className="mt-6 text-xs text-gray-500 space-y-1">
            <p>💡 Поддерживается: MetaMask, OKX, Rabby, Bitget</p>
            <p>🌐 Сеть: Pharos Testnet (Chain ID: 688688)</p>
            <p>💰 Стоимость: 1 PHRS + газ</p>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
}