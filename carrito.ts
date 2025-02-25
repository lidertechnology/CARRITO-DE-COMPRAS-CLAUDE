import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators, FormGroup } from '@angular/forms';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, DocumentData } from 'firebase/firestore';

interface Product {
  id: string;
  name: string;
  price: number;
  imageUrl: string;
  description: string;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface CustomerInfo {
  name: string;
  phone: string;
  address: string;
}

interface Order {
  items: CartItem[];
  customer: CustomerInfo;
  total: number;
  date: Date;
}

// Datos de respaldo en caso de error con Firestore
const BACKUP_PRODUCTS: Product[] = [
  {
    id: '1',
    name: 'Smartphone XYZ',
    price: 699.99,
    imageUrl: 'https://via.placeholder.com/150',
    description: 'El último modelo con características avanzadas',
    stock: 10
  },
  {
    id: '2',
    name: 'Laptop Pro',
    price: 1299.99,
    imageUrl: 'https://via.placeholder.com/150',
    description: 'Potente laptop para profesionales',
    stock: 5
  },
  {
    id: '3',
    name: 'Auriculares Inalámbricos',
    price: 149.99,
    imageUrl: 'https://via.placeholder.com/150',
    description: 'Sonido de alta calidad sin cables',
    stock: 20
  }
];

@Component({
  selector: 'app-shopping-cart',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSnackBarModule,
    MatDividerModule,
    MatBadgeModule,
    MatProgressSpinnerModule,
    MatStepperModule
  ],   
          

})
export class ShoppingCartComponent implements OnInit {
  // Señales para manejar el estado de la aplicación
  private products = signal<Product[]>([]);
  private cartItems = signal<CartItem[]>([]);
  private loading = signal<boolean>(false);
  private error = signal<boolean>(false);
  private placingOrder = signal<boolean>(false);
  
  // Señal computada para el total del carrito
  private cartTotal = computed(() => {
    return this.cartItems().reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  });
  
  // Señal computada para contar items en el carrito
  private cartItemsCount = computed(() => {
    return this.cartItems().reduce((count, item) => count + item.quantity, 0);
  });
  
  // Formulario para datos del cliente
  customerForm: FormGroup;
  
  // Configuración de Firebase (reemplazar con tus propias credenciales)
  private firebaseConfig = {
    apiKey: "tu-api-key",
    authDomain: "tu-auth-domain.firebaseapp.com",
    projectId: "tu-project-id",
    storageBucket: "tu-storage-bucket.appspot.com",
    messagingSenderId: "tu-messaging-sender-id",
    appId: "tu-app-id"
  };
  
  // Referencias de Firebase
  private app: any;
  private db: any;
  
  constructor(
    private fb: FormBuilder,
    private snackBar: MatSnackBar
  ) {
    // Inicializar formulario
    this.customerForm = this.fb.group({
      name: ['', [Validators.required]],
      phone: ['', [Validators.required, Validators.pattern(/^\+?[0-9]{8,15}$/)]],
      address: ['', [Validators.required]]
    });
    
    // Efecto para guardar el carrito en localStorage
    effect(() => {
      localStorage.setItem('cartItems', JSON.stringify(this.cartItems()));
    });
  }
  
  ngOnInit(): void {
    try {
      // Inicializar Firebase
      this.app = initializeApp(this.firebaseConfig);
      this.db = getFirestore(this.app);
      
      // Cargar productos
      this.loadProducts();
      
      // Restaurar carrito desde localStorage
      const savedCart = localStorage.getItem('cartItems');
      if (savedCart) {
        this.cartItems.set(JSON.parse(savedCart));
      }
    } catch (err) {
      console.error('Error initializing Firebase:', err);
      this.error.set(true);
      // Usar datos de respaldo
      this.products.set(BACKUP_PRODUCTS);
    }
  }
  
  /**
   * Carga los productos desde Firestore
   */
  async loadProducts(): Promise<void> {
    this.loading.set(true);
    
    try {
      const productsCollection = collection(this.db, 'products');
      const productsSnapshot = await getDocs(productsCollection);
      
      const productsData: Product[] = [];
      productsSnapshot.forEach((doc) => {
        const data = doc.data() as Omit<Product, 'id'>;
        productsData.push({ id: doc.id, ...data });
      });
      
      if (productsData.length === 0) {
        throw new Error('No products found');
      }
      
      this.products.set(productsData);
    } catch (err) {
      console.error('Error loading products:', err);
      this.error.set(true);
      // Usar datos de respaldo
      this.products.set(BACKUP_PRODUCTS);
    } finally {
      this.loading.set(false);
    }
  }
  
  /**
   * Agrega un producto al carrito
   */
  addToCart(product: Product): void {
    const currentCart = this.cartItems();
    const existingItemIndex = currentCart.findIndex(item => item.product.id === product.id);
    
    if (existingItemIndex !== -1) {
      // Si el producto ya está en el carrito, aumentar la cantidad
      const updatedCart = [...currentCart];
      if (updatedCart[existingItemIndex].quantity < product.stock) {
        updatedCart[existingItemIndex].quantity += 1;
        this.cartItems.set(updatedCart);
      }
    } else {
      // Si es un producto nuevo, agregarlo al carrito
      this.cartItems.set([...currentCart, { product, quantity: 1 }]);
    }
    
    this.snackBar.open(`${product.name} agregado al carrito`, 'Cerrar', {
      duration: 2000,
    });
  }
  
  /**
   * Verifica si un producto ya está en el carrito
   */
  isProductInCart(product: Product): boolean {
    return this.cartItems().some(item => item.product.id === product.id);
  }
  
  /**
   * Obtiene un elemento del carrito por producto
   */
  getCartItem(product: Product): CartItem {
    return this.cartItems().find(item => item.product.id === product.id) as CartItem;
  }
  
  /**
   * Elimina un producto del carrito
   */
  removeFromCart(item: CartItem): void {
    const updatedCart = this.cartItems().filter(
      cartItem => cartItem.product.id !== item.product.id
    );
    this.cartItems.set(updatedCart);
    
    this.snackBar.open(`${item.product.name} eliminado del carrito`, 'Cerrar', {
      duration: 2000,
    });
  }
  
  /**
   * Incrementa la cantidad de un producto en el carrito
   */
  incrementQuantity(item: CartItem): void {
    if (item.quantity < item.product.stock) {
      const updatedCart = this.cartItems().map(cartItem => {
        if (cartItem.product.id === item.product.id) {
          return { ...cartItem, quantity: cartItem.quantity + 1 };
        }
        return cartItem;
      });
      this.cartItems.set(updatedCart);
    }
  }
  
  /**
   * Decrementa la cantidad de un producto en el carrito
   */
  decrementQuantity(item: CartItem): void {
    if (item.quantity > 1) {
      const updatedCart = this.cartItems().map(cartItem => {
        if (cartItem.product.id === item.product.id) {
          return { ...cartItem, quantity: cartItem.quantity - 1 };
        }
        return cartItem;
      });
      this.cartItems.set(updatedCart);
    }
  }
  
  /**
   * Realiza el pedido y lo guarda en Firestore
   */
  async placeOrder(): Promise<void> {
    if (this.customerForm.invalid || this.cartItems().length === 0) {
      return;
    }
    
    this.placingOrder.set(true);
    
    try {
      const customer: CustomerInfo = this.customerForm.value;
      
      const order: Order = {
        items: this.cartItems(),
        customer,
        total: this.cartTotal(),
        date: new Date()
      };
      
      // Guardar pedido en Firestore
      const ordersCollection = collection(this.db, 'orders');
      await addDoc(ordersCollection, this.serializeOrder(order));
      
      this.snackBar.open('¡Pedido realizado con éxito!', 'Cerrar', {
        duration: 3000,
      });
      
      // Limpiar carrito después de un pedido exitoso
      this.cartItems.set([]);
      this.customerForm.reset();
      
    } catch (err) {
      console.error('Error placing order:', err);
      this.snackBar.open('Error al procesar el pedido. Intente nuevamente.', 'Cerrar', {
        duration: 3000,
      });
    } finally {
      this.placingOrder.set(false);
    }
  }
  
  /**
   * Envía el resumen del pedido a WhatsApp
   */
  sendToWhatsApp(): void {
    if (this.customerForm.invalid || this.cartItems().length === 0) {
      return;
    }
    
    const customer: CustomerInfo = this.customerForm.value;
    
    // Crear mensaje para WhatsApp
    let message = `*Nuevo Pedido*\n\n`;
    message += `*Cliente:* ${customer.name}\n`;
    message += `*Teléfono:* ${customer.phone}\n`;
    message += `*Dirección:* ${customer.address}\n\n`;
    
    message += `*Productos:*\n`;
    this.cartItems().forEach(item => {
      message += `- ${item.quantity}x ${item.product.name}: ${(item.product.price * item.quantity).toFixed(2)}\n`;
    });
    
    message += `\n*Total:* ${this.cartTotal().toFixed(2)}`;
    
    // Formato para número de WhatsApp (eliminar + y otros caracteres)
    const phone = '123456789'; // Reemplazar con tu número de WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
    
    // Abrir en nueva pestaña
    window.open(whatsappUrl, '_blank');
  }
  
  /**
   * Serializa un objeto Order para guardarlo en Firestore
   */
  private serializeOrder(order: Order): any {
    return {
      items: order.items.map(item => ({
        productId: item.product.id,
        productName: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
        subtotal: item.product.price * item.quantity
      })),
      customer: order.customer,
      total: order.total,
      date: order.date
    };
  }
}
