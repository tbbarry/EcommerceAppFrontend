# 📦 Page d'Ajout de Produit - Guide Complet

## 🎯 Vue d'ensemble

Ce module offre une expérience utilisateur complète et intuitive pour ajouter de nouveaux produits à l'e-commerce. Il est construit avec **Angular Material** et **Reactive Forms**, offrant une validation robuste et une auto-sauvegarde intelligente.

---

## 📂 Structure des fichiers

```
src/app/
├── features/product/
│   ├── add-product.component.ts          # Composant principal
│   ├── add-product.component.html        # Template avec 4 onglets
│   ├── add-product.component.css         # Styling complet
│   
├── models/
│   └── product-create.model.ts           # Interfaces et types
│
├── core/
│   ├── product.service.ts                # Service API (mis à jour)
│   └── file-validation.service.ts        # Validation de fichiers
│
└── shared/
    └── drop-zone.directive.ts            # Directive drag-and-drop
```

---

## 🎨 Fonctionnalités principales

### 1️⃣ **Formulaire multi-onglets (Material Tabs)**
- **Onglet 1 - Infos de base** : Nom, description, marque
- **Onglet 2 - Tarification** : Prix, stock avec alerte si < 10
- **Onglet 3 - Variantes** : Couleurs et tailles avec presets
- **Onglet 4 - Images** : Upload drag-and-drop avec galerie

### 2️⃣ **Validation en temps réel**
- Champs obligatoires surlignés
- Messages d'erreur inline et clairs
- Validation au blur et au submit
- Compteurs de caractères dynamiques

### 3️⃣ **Auto-sauvegarde intelligent**
- Sauvegarde du brouillon toutes les 30 secondes dans localStorage
- Chargement automatique du brouillon au chargement
- Avertissement avant fermeture si modifications non sauvegardées

### 4️⃣ **Aperçu du produit en temps réel**
- Affichage de l'image principale
- Marque, nom, prix, description
- Variantes colorées
- Responsive mobile

### 5️⃣ **Upload d'images avancé**
- Drag-and-drop zone
- Sélection multiple de fichiers
- Validation du format (JPG, PNG)
- Max 10 images
- Galerie avec suppression facile

### 6️⃣ **UX/UI professionnel**
- Design gradient moderne
- Animations fluides
- Barre d'actions sticky bottom
- Progress bar avec sections complétées
- Notifications (Snackbar) pour chaque action

---

## 🚀 Installation et Configuration

### Prérequis
```bash
# Angular Material doit être installé
ng add @angular/material

# Angular CDK pour drag-and-drop
npm install @angular/cdk
```

### Intégration dans le routing

```typescript
// app.routes.ts
import { AddProductComponent } from './features/product/add-product.component';

export const routes: Routes = [
  {
    path: 'admin/products/add',
    component: AddProductComponent
  }
];
```

---

## 📋 Modèles de données

### ProductCreateRequest
```typescript
interface ProductCreateRequest {
  name: string;              // Obligatoire
  description?: string;
  price: number;            // Obligatoire
  brand: string;            // Obligatoire
  stock?: number;
  colors?: string[];
  sizes?: string[];
  variants?: ProductVariant[];
  imageUrls?: string[];
}
```

### ProductVariant
```typescript
interface ProductVariant {
  sku: string;
  color?: string;
  size?: string;
  priceOverride?: number;
  stockOverride?: number;
}
```

---

## 🎮 Utilisation

### Naviguer vers la page d'ajout
```typescript
this.router.navigate(['/admin/products/add']);
```

### Données pré-remplies (optionnel)
```typescript
// Dans le composant
ngOnInit() {
  this.loadDraftFromStorage(); // Charge automatiquement le brouillon
  
  // Ou pré-remplir depuis les params
  this.activatedRoute.queryParams.subscribe(params => {
    if (params['brand']) {
      this.productForm.get('brand')?.setValue(params['brand']);
    }
  });
}
```

---

## 🔧 Customisation

### Modifier les limites
```typescript
// add-product.component.ts
private readonly AUTO_SAVE_INTERVAL = 30000;  // Interval d'autosave (ms)
private readonly STORAGE_KEY = 'product-form-draft'; // Clé localStorage

// add-product.component.html
<input ... maxlength="150" /> <!-- Max 150 caractères pour le nom -->
<textarea ... maxlength="1000" />  <!-- Max 1000 caractères pour description -->
```

### Ajouter des couleurs/tailles prédéfinies
```typescript
// product-create.model.ts
export const PREDEFINED_COLORS = [
  { name: 'Noir', hex: '#000000' },
  // Ajouter plus...
];

export const PREDEFINED_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
```

### Personnaliser les messages d'erreur
```typescript
// add-product.component.ts
<mat-error *ngIf="productForm.get('name')?.hasError('required')">
  Le nom est obligatoire <!-- Modifiez ce texte -->
</mat-error>
```

---

## 📡 Intégration API

### Service ProductService
```typescript
// Le service est pré-configuré
createProduct(request: ProductCreateRequest): Observable<ProductResponse> {
  return this.http.post<ProductResponse>(
    `${this.baseUrl}/api/products`,
    request
  );
}
```

### Gestion des erreurs
```typescript
// Automatiquement géré dans le composant
this.productService.createProduct(request).subscribe({
  next: (response) => {
    // Succès - redirige vers le produit créé
    this.router.navigate(['/admin/products', response.id]);
  },
  error: (error) => {
    // Affiche message d'erreur dans une snackbar
    const message = error?.error?.message || 'Erreur lors de la création';
    this.snackBar.open(`❌ ${message}`, '', { duration: 5000 });
  }
});
```

---

## 🎨 Customisation du style

### Thème Material
Le composant utilise le thème Material défini dans `styles.css`. Pour modifier les couleurs primaires:

```scss
// styles.css ou theme.scss
$primary: #667eea;
$accent: #764ba2;
```

### Modifier le gradient header
```css
/* add-product.component.css */
.header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  /* Changez les couleurs */
}
```

---

## 🧪 Tests

### Test unitaire basique
```typescript
describe('AddProductComponent', () => {
  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should validate required fields', () => {
    const form = component.productForm;
    form.get('name')?.setValue('');
    expect(form.get('name')?.hasError('required')).toBeTruthy();
  });

  it('should auto-save form state', (done) => {
    component.productForm.get('name')?.setValue('Test Product');
    setTimeout(() => {
      const saved = localStorage.getItem('product-form-draft');
      expect(saved).toBeTruthy();
      done();
    }, 31000); // Après l'intervalle d'autosave
  });
});
```

---

## 🔐 Sécurité

### Points de sécurité implémentés
1. ✅ Validation côté frontend (ne suffit pas, nécessite aussi validation backend)
2. ✅ Sanitization des URLs d'images (Angular gère automatiquement)
3. ✅ Protection contre les injections (Reactive Forms)
4. ✅ CSRF protection (via interceptor JWT)

### À implémenter côté backend
```typescript
// API Backend - Validation supplémentaire
- Vérifier la taille des fichiers
- Analyser les en-têtes de fichier (magic bytes)
- Nettoyer les noms de fichiers
- Implémenter des limites de rate-limiting
```

---

## 📱 Responsive Design

Le design est entièrement responsive:
- **Desktop (> 1024px)** : Deux colonnes (formulaire + preview)
- **Tablet (768px - 1024px)** : Une colonne, preview cachée
- **Mobile (< 768px)** : Une colonne, actions empilées

---

## 🐛 Dépannage

### Le brouillon ne se charge pas
```typescript
// Vérifiez que localStorage n'est pas désactivé
localStorage.setItem('test', 'value');
localStorage.removeItem('test');
```

### L'upload d'image ne fonctionne pas
```typescript
// Vérifiez le format des fichiers acceptés
// Seul JPG et PNG sont acceptés
// Max file size: 5MB

// Pour debug:
console.log('File type:', file.type);
console.log('File size:', file.size);
```

### Les validations ne s'affichent pas
```typescript
// Assurez-vous que ReactiveFormsModule est importé
import { ReactiveFormsModule } from '@angular/forms';
```

---

## 📚 Resources

- [Angular Material Documentation](https://material.angular.io)
- [Angular Reactive Forms](https://angular.io/guide/reactive-forms)
- [Angular CDK Drag & Drop](https://material.angular.io/cdk/drag-drop/overview)

---

## 🚦 Checklist de déploiement

- [ ] Tester sur tous les navigateurs (Chrome, Firefox, Safari, Edge)
- [ ] Vérifier l'API endpoint `/api/products`
- [ ] Configurer les limites de fichiers (backend)
- [ ] Tester l'auto-sauvegarde
- [ ] Vérifier les messages d'erreur
- [ ] Tester sur mobile
- [ ] Configurer les matériaux et couleurs de marque
- [ ] Mettre à jour la documentation API
- [ ] Former l'équipe à la nouvelle fonctionnalité

---

## 👥 Support

Pour toute question ou problème, consultez la documentation Angular Material ou contactez l'équipe frontend.

**Version:** 1.0.0  
**Dernière mise à jour:** 2026-11-19  
**Auteur:** Copilot
