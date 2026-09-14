const SECTIONS = [
  {
    title: "Registrar un contenedor",
    body: "Ve a Contenedores → \"+ Registrar contenedor\". Completa lo que sepas por ahora (proyecto, tamaño, fechas) y guarda; puedes volver a editarlo en cualquier momento conforme avance el embarque.",
  },
  {
    title: "Subir facturas del broker",
    body: "Dentro de cada contenedor hay una sección \"Facturas del broker\" para subir el PDF o imagen y anotar a qué Commercial Invoice (CI) corresponde. También puedes ver todas las facturas juntas en la sección Facturas.",
  },
  {
    title: "Consultar tarifas de flete",
    body: "En Tarifas de Flete están las tarifas que han dado los navieros/agentes (Overseas, Laser, etc.) por ruta y tamaño de contenedor, para consultarlas al presupuestar un contenedor nuevo.",
  },
  {
    title: "Calculadora de Broker",
    body: "Estima el costo de Bahamas Customs, Brokerage y cargos de puerto antes de que llegue la factura real. El resultado se puede guardar directamente en el campo \"Broker presupuestado\" de un contenedor.",
  },
  {
    title: "Roles de usuario",
    body: "Los Administradores pueden gestionar Proyectos, Usuarios y las tarifas/tasas de referencia. Los Editores pueden registrar y editar contenedores y facturas, pero no ven esas secciones administrativas.",
  },
];

export default function HelpPage() {
  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold">Ayuda</h1>
        <p className="text-sm text-muted mt-1">Guía rápida de uso de Supply-Chain-App.</p>
      </div>

      <div className="space-y-4">
        {SECTIONS.map((s) => (
          <div key={s.title} className="bg-surface border border-border rounded-xl p-5 card-shadow">
            <h2 className="text-sm font-semibold">{s.title}</h2>
            <p className="text-sm text-muted mt-1.5 leading-relaxed">{s.body}</p>
          </div>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-5 card-shadow">
        <h2 className="text-sm font-semibold">¿Algo no funciona o falta?</h2>
        <p className="text-sm text-muted mt-1.5 leading-relaxed">
          Avísale a tu administrador — Cay Building Co. mantiene esta aplicación a la medida del
          equipo, así que cualquier ajuste se puede incorporar.
        </p>
      </div>
    </div>
  );
}
