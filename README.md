# CARRITO-DE-COMPRAS-CLAUDE

Voy a crear un componente Angular autónomo para un carrito de compras e-commerce con integración directa a Firebase, siguiendo todas tus especificaciones técnicas.
    
    

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
