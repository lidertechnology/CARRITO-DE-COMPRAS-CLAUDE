# CARRITO-DE-COMPRAS-CLAUDE

Voy a crear un componente Angular autónomo para un carrito de compras e-commerce con integración directa a Firebase, siguiendo todas tus especificaciones técnicas.

```typescript
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
  template: `
    <div class="container">
      <h1 class="title">Tienda Online</h1>
      
      <!-- Stepper para guiar al usuario a través del proceso de compra -->
      <mat-stepper linear #stepper>
        <!-- Paso 1: Selección de productos -->
        <mat-step completed="{{cartItems().length > 0}}">
          <ng-template matStepLabel>Productos</ng-template>
          
          <div class="loading-container" *ngIf="loading()">
            <mat-spinner diameter="50"></mat-spinner>
            <p>Cargando productos...</p>
          </div>
          
          <div class="error-message" *ngIf="error()">
            <p>Error al cargar productos. Mostrando datos de respaldo.</p>
          </div>
          
          <div class="products-grid">
            <mat-card class="product-card" *ngFor="let product of products()">
              <img mat-card-image [src]="product.imageUrl" [alt]="product.name">
              <mat-card-header>
                <mat-card-title>{{ product.name }}</mat-card-title>
                <mat-card-subtitle>{{ product.price | currency }}</mat-card-subtitle>
              </mat-card-header>
              <mat-card-content>
                <p>{{ product.description }}</p>
                <p *ngIf="product.stock < 5" class="low-stock">¡Solo quedan {{ product.stock }}!</p>
              </mat-card-content>
              <mat-card-actions>
                <button 
                  mat-raised-button 
                  color="primary" 
                  (click)="addToCart(product)"
                  [disabled]="product.stock === 0 || isProductInCart(product) && getCartItem(product).quantity >= product.stock">
                  <mat-icon>add_shopping_cart</mat-icon> Agregar
                </button>
              </mat-card-actions>
            </mat-card>
          </div>
          
          <div class="stepper-buttons">
            <button mat-button matStepperNext [disabled]="cartItems().length === 0">Continuar al Carrito</button>
          </div>
        </mat-step>
        
        <!-- Paso 2: Revisión del carrito -->
        <mat-step [completed]="customerForm.valid && cartItems().length > 0">
          <ng-template matStepLabel>Carrito</ng-template>
          
          <h2>Tu Carrito</h2>
          
          <div class="empty-cart" *ngIf="cartItems().length === 0">
            <mat-icon class="large-icon">shopping_cart</mat-icon>
            <p>Tu carrito está vacío</p>
            <button mat-button matStepperPrevious>Volver a Productos</button>
          </div>
          
          <div class="cart-items" *ngIf="cartItems().length > 0">
            <mat-card class="cart-item" *ngFor="let item of cartItems()">
              <div class="cart-item-content">
                <img [src]="item.product.imageUrl" [alt]="item.product.name" class="cart-item-image">
                <div class="cart-item-details">
                  <h3>{{ item.product.name }}</h3>
                  <p>{{ item.product.price | currency }} c/u</p>
                </div>
                <div class="cart-item-quantity">
                  <button mat-icon-button (click)="decrementQuantity(item)" [disabled]="item.quantity <= 1">
                    <mat-icon>remove</mat-icon>
                  </button>
                  <span>{{ item.quantity }}</span>
                  <button mat-icon-button (click)="incrementQuantity(item)" [disabled]="item.quantity >= item.product.stock">
                    <mat-icon>add</mat-icon>
                  </button>
                </div>
                <div class="cart-item-total">
                  {{ item.product.price * item.quantity | currency }}
                </div>
                <button mat-icon-button color="warn" (click)="removeFromCart(item)">
                  <mat-icon>delete</mat-icon>
                </button>
              </div>
            </mat-card>
            
            <mat-card class="cart-summary">
              <h3>Resumen</h3>
              <div class="summary-row">
                <span>Subtotal:</span>
                <span>{{ cartTotal() | currency }}</span>
              </div>
              <div class="summary-row total-row">
                <span>Total:</span>
                <span>{{ cartTotal() | currency }}</span>
              </div>
            </mat-card>
            
            <h3>Datos de Entrega</h3>
            <form [formGroup]="customerForm" class="customer-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Nombre completo</mat-label>
                <input matInput formControlName="name" required>
                <mat-error *ngIf="customerForm.get('name')?.invalid && customerForm.get('name')?.touched">
                  Nombre completo es requerido
                </mat-error>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="phone" type="tel" required>
                <mat-error *ngIf="customerForm.get('phone')?.invalid && customerForm.get('phone')?.touched">
                  Ingrese un número de teléfono válido
                </mat-error>
              </mat-form-field>
              
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Dirección de entrega</mat-label>
                <textarea matInput formControlName="address" rows="3" required></textarea>
                <mat-error *ngIf="customerForm.get('address')?.invalid && customerForm.get('address')?.touched">
                  Dirección de entrega es requerida
                </mat-error>
              </mat-form-field>
            </form>
          </div>
          
          <div class="stepper-buttons">
            <button mat-button matStepperPrevious>Volver</button>
            <button mat-button matStepperNext [disabled]="!customerForm.valid || cartItems().length === 0">Continuar</button>
          </div>
        </mat-step>
        
        <!-- Paso 3: Resumen y confirmación -->
        <mat-step>
          <ng-template matStepLabel>Confirmar</ng-template>
          
          <h2>Resumen del Pedido</h2>
          
          <mat-card class="order-summary">
            <h3>Productos</h3>
            <div class="summary-item" *ngFor="let item of cartItems()">
              <div class="summary-item-details">
                <span>{{ item.quantity }}x {{ item.product.name }}</span>
              </div>
              <div class="summary-item-price">
                {{ item.product.price * item.quantity | currency }}
              </div>
            </div>
            
            <mat-divider></mat-divider>
            
            <div class="summary-total">
              <span>Total:</span>
              <span>{{ cartTotal() | currency }}</span>
            </div>
            
            <h3>Datos de Entrega</h3>
            <div class="customer-details" *ngIf="customerForm.valid">
              <p><strong>Nombre:</strong> {{ customerForm.get('name')?.value }}</p>
              <p><strong>Teléfono:</strong> {{ customerForm.get('phone')?.value }}</p>
              <p><strong>Dirección:</strong> {{ customerForm.get('address')?.value }}</p>
            </div>
          </mat-card>
          
          <div class="actions-container">
            <button mat-raised-button color="primary" (click)="placeOrder()" [disabled]="placingOrder()">
              <mat-icon>check_circle</mat-icon>
              Confirmar Pedido
              <mat-spinner diameter="20" *ngIf="placingOrder()" class="button-spinner"></mat-spinner>
            </button>
            
            <button mat-raised-button color="accent" (click)="sendToWhatsApp()" [disabled]="placingOrder()">
              <mat-icon>smartphone</mat-icon>
              Enviar a WhatsApp
            </button>
          </div>
          
          <div class="stepper-buttons">
            <button mat-button matStepperPrevious [disabled]="placingOrder()">Volver</button>
            <button mat-button (click)="stepper.reset()" [disabled]="placingOrder()">Comenzar Nuevo Pedido</button>
          </div>
        </mat-step>
      </mat-stepper>
      
      <!-- Badge con el contador de productos en el carrito -->
      <button 
        mat-fab 
        color="accent" 
        class="cart-fab" 
        [matBadge]="cartItemsCount()" 
        matBadgeColor="warn" 
        [matBadgeHidden]="cartItemsCount() === 0"
        (click)="stepper.selectedIndex = 1"
        *ngIf="stepper.selectedIndex === 0">
        <mat-icon>shopping_cart</mat-icon>
      </button>
    </div>
  `,
  styles: [`
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 16px;
      position: relative;
    }
    
    .title {
      text-align: center;
      margin-bottom: 24px;
      color: #3f51b5;
    }
    
    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin: 48px 0;
    }
    
    .error-message {
      background-color: #ffebee;
      color: #c62828;
      padding: 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    
    .products-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .product-card {
      height: 100%;
      display: flex;
      flex-direction: column;
    }
    
    .product-card img {
      height: 200px;
      object-fit: cover;
    }
    
    .low-stock {
      color: #f44336;
      font-weight: bold;
    }
    
    .cart-items {
      margin-bottom: 24px;
    }
    
    .cart-item {
      margin-bottom: 16px;
    }
    
    .cart-item-content {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
    }
    
    .cart-item-image {
      width: 80px;
      height: 80px;
      object-fit: cover;
      margin-right: 16px;
    }
    
    .cart-item-details {
      flex-grow: 1;
      min-width: 200px;
    }
    
    .cart-item-details h3 {
      margin: 0 0 8px 0;
    }
    
    .cart-item-quantity {
      display: flex;
      align-items: center;
      margin: 0 16px;
    }
    
    .cart-item-quantity span {
      margin: 0 8px;
      min-width: 24px;
      text-align: center;
    }
    
    .cart-item-total {
      font-weight: bold;
      margin: 0 16px;
      min-width: 80px;
      text-align: right;
    }
    
    .cart-summary {
      margin-top: 16px;
      padding: 16px;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .total-row {
      font-weight: bold;
      font-size: 1.2em;
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid #ccc;
    }
    
    .customer-form {
      display: flex;
      flex-direction: column;
      margin-top: 16px;
    }
    
    .full-width {
      width: 100%;
    }
    
    .stepper-buttons {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-top: 16px;
    }
    
    .empty-cart {
      text-align: center;
      padding: 48px 0;
    }
    
    .large-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      margin-bottom: 16px;
      color: #9e9e9e;
    }
    
    .order-summary {
      margin-bottom: 24px;
    }
    
    .summary-item {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    
    .summary-total {
      display: flex;
      justify-content: space-between;
      font-weight: bold;
      font-size: 1.2em;
      margin-top: 16px;
      margin-bottom: 16px;
    }
    
    .customer-details {
      margin-top: 8px;
    }
    
    .actions-container {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .button-spinner {
      display: inline-block;
      margin-left: 8px;
    }
    
    .cart-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 100;
    }
    
    /* Responsive styles */
    @media (max-width: 768px) {
      .products-grid {
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
      }
      
      .cart-item-content {
        flex-direction: column;
        align-items: flex-start;
      }
      
      .cart-item-details, .cart-item-quantity, .cart-item-total {
        margin: 8px 0;
      }
      
      .actions-container {
        flex-direction: column;
      }
    }
  `]
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

```

Este componente Angular standalone implementa un carrito de compras e-commerce completamente funcional con integración directa a Firebase Firestore. Vamos a explicar sus características principales y cómo funciona:

## Características técnicas

1. **Diseño con Angular Material**: El componente utiliza varios módulos de Angular Material como MatCard, MatButton, MatIcon, MatStepper, entre otros, para crear una interfaz moderna y atractiva.

2. **Componente autónomo**: Está implementado como un componente standalone de Angular, sin dependencias de servicios externos, todo en un solo archivo.

3. **Integración directa con Firestore**: Utiliza la API nativa de Firebase (sin AngularFire) para conectarse directamente a Firestore.

4. **Reactividad con Signals**: La gestión del estado se realiza exclusivamente mediante los signals de Angular, sin usar RxJS.

5. **Diseño responsivo**: El CSS incluye media queries para adaptarse a diferentes tamaños de pantalla.

## Funcionalidades implementadas

1. **Visualización de productos**: 
   - Carga productos desde Firestore
   - Tiene datos de respaldo en caso de error de conexión
   - Muestra una cuadrícula de productos con imágenes, precios y descripciones

2. **Gestión del carrito**:
   - Permite agregar productos al carrito
   - Muestra un contador en un botón flotante
   - Permite modificar cantidades o eliminar productos
   - Calcula subtotales y total automáticamente

3. **Proceso de compra guiado**:
   - Implementa un proceso de compra en 3 pasos mediante stepper
   - Validaciones en cada paso para asegurar datos correctos

4. **Captura de datos del cliente**:
   - Formulario con validaciones para nombre, teléfono y dirección
   - Muestra mensajes de error apropiados

5. **Resumen del pedido**:
   - Muestra productos, cantidades y precios
   - Muestra datos del cliente
   - Opciones para confirmar o modificar el pedido

6. **Integración con WhatsApp**:
   - Genera un enlace wa.me con el resumen del pedido formateado
   - Abre en una nueva pestaña

7. **Persistencia de datos**:
   - Guarda el pedido en Firestore
   - Utiliza localStorage para conservar el carrito entre sesiones

## Aspectos destacados de la implementación

1. **Manejo de errores**: Incluye datos de respaldo y muestra mensajes apropiados en caso de error.

2. **Validaciones**: Implementa validaciones para datos del cliente y cantidades (no exceder el stock).

3. **Experiencia de usuario**: Proporciona feedback mediante snackbars, indicadores de carga, y un proceso de compra intuitivo.

4. **Persistencia en localStorage**: El carrito se guarda automáticamente, mejorando la experiencia del usuario.

Para utilizar este componente:

1. Reemplaza las credenciales de Firebase en `firebaseConfig` con las tuyas.
2. Configura el número de WhatsApp en la función `sendToWhatsApp()`.
3. Asegúrate de tener una colección `products` en Firestore con la estructura adecuada.
4. Import
