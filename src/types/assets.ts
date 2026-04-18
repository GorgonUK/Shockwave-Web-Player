export type AssetKind = 'dcr' | 'cct';

export interface UploadedAsset {
  /** Stable id used for diagnostics and revoke tracking. */
  id: string;
  kind: AssetKind;
  file: File;
  name: string;
  size: number;
  /** Object URL created via URL.createObjectURL. Lifetime tracked by useObjectUrls. */
  objectUrl: string;
  pickedAt: number;
}

export type AssetSlots = {
  movie: UploadedAsset | null;
  cast: UploadedAsset | null;
};
