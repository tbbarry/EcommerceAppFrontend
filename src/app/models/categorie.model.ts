export interface Category {
  id: number;
  name: string;
  children: Category[];
}

export interface MegaMenuColumn {
  title: string;
  links: MegaMenuLink[];
}

export interface MegaMenuLink {
  id: number;
  name: string;
}

export interface MegaMenuCategory {
  id: number;
  name: string;
  columns: MegaMenuColumn[];
}