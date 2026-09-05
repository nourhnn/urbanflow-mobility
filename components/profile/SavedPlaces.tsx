import {
    BriefcaseBusiness,
    ChevronRight,
    House,
  } from "lucide-react";
  
  import Link from "next/link";
  
  type SavedPlacesProps = {
    homeAddress?: string | null;
    workAddress?: string | null;
    compact?: boolean;
  };
  
  export default function SavedPlaces({
    homeAddress,
    workAddress,
    compact = false,
  }: SavedPlacesProps) {
    const places = [
        {
          label: "Maison",
          address: homeAddress || null,
          icon: House,
        },
        {
          label: "Travail",
          address: workAddress || null,
          icon: BriefcaseBusiness,
        },
      ];
  
    return (
      <section className={compact ? "mt-6" : "mt-8"}>
        <div className="flex items-center justify-between">
          <h2 className="uf-h3 text-secondary">
            Lieux enregistrés
          </h2>
  
          <Link
            href="/profil/modifier"
            className="uf-caption font-semibold text-primary"
          >
            Modifier
          </Link>
        </div>
  
        <div className="mt-4 space-y-3">
          {places.map(
            ({
              label,
              address,
              icon: Icon,
            }) => (
    <Link
  key={label}
  href={
    address
      ? `/trajets?destination=${encodeURIComponent(address)}`
      : "/profil/modifier"
  }
  className="uf-card flex items-center gap-4 p-4"
>
  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
    <Icon size={19} />
  </div>

  <div className="min-w-0 flex-1">
    <p className="uf-label text-secondary">
      {label}
    </p>

    <p className="uf-caption mt-1 truncate text-muted">
      {address || "Aucune adresse enregistrée"}
    </p>
  </div>

  <ChevronRight
    size={18}
    className="shrink-0 text-subtle"
  />
    </Link>
            )
          )}
        </div>
      </section>
    );
  }