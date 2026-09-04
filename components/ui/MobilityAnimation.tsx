import {
    Bike,
    Bus,
    Clock,
    Coins,
    Leaf,
    MapPin,
    Navigation,
    Trees,
  } from "lucide-react";
  
  const features = [
    {
      label: "Itinéraire intelligent",
      icon: Navigation,
      className: "uf-feature-1",
    },
    {
      label: "CO₂ économisé",
      icon: Leaf,
      className: "uf-feature-2",
    },
    {
      label: "+ FLOWS",
      icon: Coins,
      className: "uf-feature-3",
    },
    {
      label: "Temps réel",
      icon: Clock,
      className: "uf-feature-4",
    },
  ];
  
  const decorativeIcons = [
    {
      icon: Bike,
      className: "uf-deco-icon-1",
    },
    {
      icon: Bus,
      className: "uf-deco-icon-2",
    },
    {
      icon: Trees,
      className: "uf-deco-icon-3",
    },
    {
      icon: Leaf,
      className: "uf-deco-icon-4",
    },
  ];
  
  export default function MobilityAnimation() {
    return (
      <div className="uf-mobility-animation">
        {/* Décor de fond */}
        <div className="uf-blob uf-blob-primary" />
        <div className="uf-blob uf-blob-secondary" />
        <div className="uf-blob uf-blob-accent" />
  
        {/* Icônes décoratives flottantes */}
        {decorativeIcons.map(({ icon: Icon, className }, index) => (
          <div key={index} className={`uf-deco-icon ${className}`}>
            <Icon size={16} strokeWidth={2.2} />
          </div>
        ))}
  
        {/* Route */}
        <div className="uf-route">
          <div className="uf-route-line" />
          <div className="uf-route-dots" />
  
          <div className="uf-route-start">
            <MapPin size={17} strokeWidth={2.5} />
          </div>
  
          <div className="uf-moving-point">
            <div className="uf-moving-core" />
          </div>
  
          <div className="uf-route-end">
            <Leaf size={17} strokeWidth={2.5} />
          </div>
        </div>
  
        {/* Informations animées */}
        {features.map(({ label, icon: Icon, className }) => (
          <div key={label} className={`uf-feature ${className}`}>
            <span className="uf-feature-icon">
              <Icon size={16} strokeWidth={2.2} />
            </span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    );
  }