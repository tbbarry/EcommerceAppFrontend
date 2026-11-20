# 🧪 Guide de Test - Add Product Component

## ✅ Tests Rapides

Maintenant que la compilation est réussie, voici comment tester l'application.

### **1. Démarrer le serveur de développement**

```bash
ng serve --configuration development
```

Ou avec le alias npm (si configuré):
```bash
npm start
```

Vous verrez:
```
✓ Building...
✓ Compiled successfully.

Resources are optimized for production. Use --configuration development for faster builds.

Application bundle generation complete. [XX.XXX seconds]
```

### **2. Ouvrir l'application**

Dans votre navigateur, allez à:
```
http://localhost:4200/admin/products/add
```

Vous devriez voir:
- ✅ 4 onglets Material (Infos de base, Tarification, Variantes, Images)
- ✅ Un aperçu du produit sur la barre latérale droite
- ✅ Une barre d'actions sticky en bas avec boutons Annuler / Enregistrer / Publier

### **3. Tester le Formulaire**

#### **Tab 1: Informations de Base**
- [ ] Remplissez le **Nom du produit** (max 150 caractères)
  - Vérifiez que le compteur de caractères se met à jour
  - Vérifiez que le champ devient vert quand il est valide
  - Vérifiez que le champ devient rouge quand il est vide au blur

- [ ] Remplissez la **Description**
  - Compteur de caractères fonctionnel
  - Validation à la perte de focus

- [ ] Remplissez la **Marque**
  - Autocomplete fonctionne (tapez "ni" et vous devriez voir "Nike")
  - Validation de ce champ

#### **Tab 2: Tarification & Stock**
- [ ] Entrez un **Prix** (ex: 29.99)
  - Le symbole € ou $ s'affiche
  - Format décimal accepté
  - Validation: doit être ≥ 0

- [ ] Entrez un **Stock** (ex: 50)
  - Les boutons +/- fonctionnent
  - Validation: entier ≥ 0
  - Alerte visuelle si stock < 10 (orange)

#### **Tab 3: Variantes**
- [ ] Ajoutez des **Couleurs**
  - Tapez une couleur et appuyez sur Entrée ou cliquez "Ajouter"
  - Vérifiez que les couleurs prédéfinies s'auto-complètent
  - Supprimez avec le bouton X

- [ ] Ajoutez des **Tailles**
  - Les présets XS, S, M, L, XL, XXL fonctionnent
  - Ou entrez une taille custom
  - Supprimez facilement

#### **Tab 4: Images & Aperçu**
- [ ] **Upload par Drag-Drop**
  - Glissez une image JPG/PNG sur la zone pointillée
  - L'image apparaît en miniature
  - Maximum 10 images

- [ ] **Upload par clic**
  - Cliquez sur "Sélectionner des fichiers"
  - Choisissez une ou plusieurs images

- [ ] **Validation des fichiers**
  - Essayez d'uploader un fichier non-image
  - Vous devriez voir: "❌ Format non supporté (JPG, PNG uniquement)"

#### **Aperçu en Temps Réel**
- [ ] L'aperçu à droite se met à jour en temps réel:
  - Quand vous changez le nom
  - Quand vous changez le prix
  - Quand vous uploadez une image (apparaît en haut)

### **4. Tester la Validation**

- [ ] Cliquez sur le bouton **"Publier produit"** sans rien remplir
  - Les champs obligatoires deviennent **rouges**
  - Messages d'erreur inline apparaissent
  - Le bouton "Publier" reste **désactivé**

- [ ] Remplissez tous les champs obligatoires:
  - Nom ✓
  - Marque ✓
  - Prix ✓
  - Stock ✓
  - Le bouton "Publier" devient **activé**

### **5. Tester l'Auto-Save (localStorage)**

- [ ] Remplissez partiellement le formulaire
- [ ] Ouvrez la **Console DevTools** (F12)
- [ ] Allez à l'onglet **Application → Local Storage**
- [ ] Cherchez la clé: `product-form-draft`
- [ ] Vérifiez que les données s'y sauvegardent automatiquement
- [ ] Rafraîchissez la page (F5)
- [ ] Les données précédemment saisies doivent réapparaître! 

### **6. Tester la Soumission**

Avant de tester, assurez-vous que:
- ✅ Le backend API est disponible (endpoint `POST /api/products`)
- ✅ CORS est correctement configuré

Si oui:
- [ ] Remplissez complètement le formulaire
- [ ] Cliquez sur "Publier produit"
- [ ] Vous devriez voir: **"Produit en cours de création..."** (toast)
- [ ] Spin animation sur le bouton
- [ ] Après succès: **"✓ Produit créé avec succès !"** 

Si le backend n'est pas disponible:
- [ ] Vous verrez une erreur dans la console
- [ ] C'est normal - c'est côté backend qu'il faut vérifier

### **7. Tester les Interactions**

- [ ] **Cambio de onglet**: Les données persistent quand vous changez d'onglet
- [ ] **Barre de progression**: "2/4 sections complétées" se met à jour
- [ ] **Bouton Annuler**: Vous ramène à la page précédente (si navigation guard est configuré)
- [ ] **Mode responsive**: Redimensionnez le navigateur
  - Sur mobile (< 768px), l'aperçu se cache (design mobile-first)

---

## 🐛 Dépannage

### **Le formulaire ne s'affiche pas**

**Cause possible:** Route non accessible
```bash
# Vérifiez la route dans app.routes.ts
grep -n "admin/products/add" src/app/app.routes.ts
```

**Solution:** Vérifiez que l'authGuard n'empêche pas l'accès ou que vous êtes authentifié.

### **Les styles Material ne s'appliquent pas**

**Cause possible:** Material n'est pas importé
```bash
# Vérifiez que Material est installé
npm list @angular/material
# Doit afficher: @angular/material@19.x.x
```

**Solution:** Si manquant, réinstallez:
```bash
ng add @angular/material@19
```

### **Les images ne s'uploadent pas**

**Cause possible:** FileReader API pas supportée
```bash
# Les navigateurs modernes le supportent tous
# Vérifiez la console (F12) pour les erreurs
```

### **L'auto-save ne fonctionne pas**

**Cause possible:** localStorage désactivé
```javascript
// Dans la console (F12), vérifiez:
localStorage.setItem('test', 'test');
localStorage.getItem('test');
// Doit retourner 'test'
```

### **Le bouton "Publier" reste désactivé**

**Cause possible:** Champ obligatoire invalide
```bash
# Vérifiez que vous avez rempli:
# ✓ Nom (non-vide, max 150 caractères)
# ✓ Marque (sélectionnée)
# ✓ Prix (≥ 0)
# ✓ Stock (≥ 0)
```

---

## 📊 Checklist Finale

Avant de considérer que le composant fonctionne bien:

- [ ] Application compile sans erreurs TypeScript
- [ ] Composant s'affiche correctement à `/admin/products/add`
- [ ] Tous les 4 onglets sont visibles
- [ ] Validation fonctionne (champs rouge/vert)
- [ ] Auto-save sauvegarde dans localStorage
- [ ] Images s'uploadent par drag-drop
- [ ] Aperçu se met à jour en temps réel
- [ ] Formulaire se valide complètement
- [ ] Bouton "Publier" devient actif avec tous les champs valides
- [ ] Design est responsive (desktop/tablet/mobile)
- [ ] Messages de confirmation s'affichent

---

## 🚀 Pour Aller Plus Loin

### **Tester l'intégration API complète**

1. Assurez-vous que le backend expose `POST /api/products`
2. Remplissez le formulaire
3. Cliquez "Publier produit"
4. Vérifiez dans le backend que le produit est créé
5. Vérifiez la réponse JSON dans la console (Network tab)

### **Debugger le formulaire**

```javascript
// Dans la console (F12):
// Pour accéder au composant Angular:
ng.getComponent(document.querySelector('app-add-product'))

// Pour voir l'état du formulaire:
const component = ng.getComponent(...);
console.log(component.productForm.value);
console.log(component.productForm.status);
```

### **Vérifier les logs**

L'application log les événements importants:
```bash
# Pour voir auto-save:
# "Auto-save: Draft saved to localStorage" - Tous les 30s

# Pour voir soumission:
# "Form submitted successfully!" - Après succès API

# Pour voir erreurs:
# "Error creating product: ..." - En cas d'erreur
```

---

**Status:** ✅ Prêt pour les tests!

Lancer: `ng serve --configuration development` et visitez `http://localhost:4200/admin/products/add`
