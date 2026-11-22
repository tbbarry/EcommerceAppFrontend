# EcommerceApp

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 18.2.21.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Administration des produits

La page `/admin/products/:id` permet de modifier les informations du produit, les images, les variantes et le stock, ainsi que d'archiver le produit. L'ajout d'image se fait par URL HTTP(S), avec aperçu ; aucun fichier n'est envoyé par ce formulaire. Les requêtes utilisent `environment.apiBaseUrl` et l'intercepteur JWT existant.

Les routes GET de liste et de détail étaient fournies ; **les opérations d'écriture ci-dessous sont un contrat proposé et doivent être implémentées ou adaptées côté backend avant utilisation**. Le contrôle d'accès administrateur doit être appliqué côté serveur ; les gardes frontend restent désactivées.

Toutes les requêtes utilisent le préfixe `/api/admin/products/{productId}`. Les écritures envoient du JSON :

| Méthode et chemin | Corps JSON |
| --- | --- |
| `PATCH` | `{"name":"T-shirt","description":"Coton","brand":"Marque","categoryId":3,"price":25,"slug":"t-shirt"}` |
| `POST /variants` | `{"sku":"TS-ROUGE-M","price":25,"attributeValueIds":[12,35],"quantity":10}` |
| `PATCH /variants/{variantId}` | `{"sku":"TS-ROUGE-M","price":27,"attributeValueIds":[12,35]}` |
| `PATCH /variants/{variantId}/stock` | `{"quantity":12}` |
| `DELETE /variants/{variantId}` | Aucun |
| `POST /variants/bulk-delete` | `{"variantIds":[101,102]}` |
| `POST /images` | `{"url":"https://exemple.com/image.jpg","alt":"Vue de face","isMain":false,"displayOrder":1,"visualAttributeValueId":12}` |
| `PATCH /images/{imageId}` | `{"alt":"Vue de face","isMain":true,"displayOrder":1,"visualAttributeValueId":null}` |
| `DELETE /images/{imageId}` | Aucun |
| `PATCH /status` | `{"status":"ARCHIVED"}` |

`visualAttributeValueId` est facultatif à la création ; `null` supprime l'association lors d'une modification. Pour choisir une image principale, le frontend peut envoyer uniquement `{"isMain":true}`. Le backend doit maintenir une seule image principale, vérifier les stocks réservés et exécuter la suppression multiple de façon atomique. Il doit également valider les valeurs, les droits et les statuts ; notamment, `ARCHIVED` reste à confirmer. Les catégories et attributs sont chargés via `GET /api/categories` et `GET /api/attributes/with-values`. Après chaque écriture réussie, la page recharge le détail avec `GET /api/admin/products/{productId}` ; si ce rechargement échoue, elle indique que l'écriture a réussi et propose de réessayer.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

