import React from 'react';

export function OrGateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {/* Triángulo principal */}
      <path d="M6 6l12 6-12 6V6z" />
      {/* Dos líneas de entrada a la izquierda */}
      <line x1="2" y1="9" x2="6" y2="9" />
      <line x1="2" y1="15" x2="6" y2="15" />
      {/* Una línea de salida a la derecha */}
      <line x1="18" y1="12" x2="22" y2="12" />
    </svg>
  );
}
