type OrnamentProps = {
  className?: string;
};

function resolveClassName(
  baseClassName: string,
  className?: string,
) {
  return [baseClassName, className].filter(Boolean).join(" ");
}

export function MapGridBackground({ className }: OrnamentProps) {
  return (
    <div
      aria-hidden="true"
      className={resolveClassName("sl-landing-map-grid-bg", className)}
    >
      <span className="sl-landing-map-grid-layer sl-landing-map-grid-layer-minor" />
      <span className="sl-landing-map-grid-layer sl-landing-map-grid-layer-major" />
      <span className="sl-landing-map-grid-halo sl-landing-map-grid-halo-a" />
      <span className="sl-landing-map-grid-halo sl-landing-map-grid-halo-b" />
      <span className="sl-landing-map-grid-node sl-landing-map-grid-node-a" />
      <span className="sl-landing-map-grid-node sl-landing-map-grid-node-b" />
      <span className="sl-landing-map-grid-node sl-landing-map-grid-node-c" />
    </div>
  );
}

export function SectionSignalDivider({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      className={resolveClassName("sl-landing-section-divider", className)}
      viewBox="0 0 320 28"
      preserveAspectRatio="none"
    >
      <path
        className="sl-landing-divider-path"
        d="M6 14H110C126 14 126 8 142 8H178C194 8 194 20 210 20H314"
      />
      <circle className="sl-landing-divider-node" cx="54" cy="14" r="3.5" />
      <circle className="sl-landing-divider-node" cx="160" cy="8" r="4.5" />
      <circle className="sl-landing-divider-node" cx="264" cy="20" r="3.5" />
    </svg>
  );
}

export function NodeClusterOrnament({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      className={resolveClassName("sl-landing-node-cluster", className)}
      viewBox="0 0 260 78"
      preserveAspectRatio="none"
    >
      <path
        className="sl-landing-cluster-link"
        d="M24 46C48 46 64 46 84 38C102 31 116 18 136 18C152 18 166 26 182 36C196 44 212 50 236 50"
      />
      <path
        className="sl-landing-cluster-link is-secondary"
        d="M84 38C100 50 112 58 128 58C146 58 160 44 178 36"
      />
      <circle className="sl-landing-cluster-node is-large" cx="24" cy="46" r="7" />
      <circle className="sl-landing-cluster-node" cx="84" cy="38" r="5" />
      <circle className="sl-landing-cluster-node is-large" cx="136" cy="18" r="7" />
      <circle className="sl-landing-cluster-node" cx="178" cy="36" r="5" />
      <circle className="sl-landing-cluster-node is-large" cx="236" cy="50" r="7" />
    </svg>
  );
}

export function CausalPathOrnament({ className }: OrnamentProps) {
  return (
    <svg
      aria-hidden="true"
      className={resolveClassName("sl-landing-causal-path", className)}
      viewBox="0 0 360 220"
      preserveAspectRatio="xMidYMid meet"
    >
      <path
        className="sl-landing-causal-path-line"
        d="M22 150C74 150 92 76 148 76C196 76 210 136 260 136C304 136 316 94 338 54"
      />
      <path
        className="sl-landing-causal-path-line is-secondary"
        d="M94 174C126 174 142 110 182 110C216 110 228 164 274 164"
      />
      <circle className="sl-landing-causal-node is-soft" cx="22" cy="150" r="12" />
      <circle className="sl-landing-causal-node" cx="148" cy="76" r="10" />
      <circle className="sl-landing-causal-node is-soft" cx="260" cy="136" r="12" />
      <circle className="sl-landing-causal-node" cx="338" cy="54" r="9" />
    </svg>
  );
}
