export interface CompanyCamProject {
  id: string;
  name: string;
  address: CompanyCamAddress;
  status: string;
  created_at: number;
  updated_at: number;
  public: boolean;
  slug: string;
  photo_count: number;
  integration_ids: string[];
  [key: string]: unknown;
}

export interface CompanyCamAddress {
  street_address_1: string;
  street_address_2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  lat: number;
  lng: number;
}

export interface CompanyCamPhoto {
  id: string;
  project_id: string;
  creator_id: string;
  creator_type: string;
  created_at: number;
  updated_at: number;
  captured_at: number;
  lat: number | null;
  lng: number | null;
  uris: CompanyCamPhotoUri[];
  tags: CompanyCamTag[];
  [key: string]: unknown;
}

export interface CompanyCamPhotoUri {
  type: string;
  uri: string;
}

export interface CompanyCamTag {
  id: string;
  display_value: string;
  [key: string]: unknown;
}
