import './PdmOverview.css';

type PdmPage = {
  title: string;
  file: string;
  form?: string;
  live?: boolean;
};

type PdmGroup = {
  key: string;
  label: string;
  icon: string;
  pages: PdmPage[];
};

const PDM_GROUPS: PdmGroup[] = [
  {
    key: 'engineering', label: 'Entwicklung', icon: '⚙️',
    pages: [
      { title: 'Objekte',        file: 'objects.html',    form: 'Form_PdmObjekte' },
      { title: 'Stückliste',     file: 'bom.html',        form: 'Form_BomVerwaltung' },
      { title: 'Objekt anlegen', file: 'new-object.html', live: true },
    ],
  },
  {
    key: 'planung', label: 'Planung', icon: '📋',
    pages: [
      { title: 'Fertigungsauftrag',       file: 'production-order.html',     form: 'Form_ProductionOrder' },
      { title: 'Auftragsübersicht',       file: 'orders.html',               form: 'Form_AuftragsVerwaltung' },
      { title: 'Produktionsübersicht',    file: 'production-dashboard.html', form: 'Form_ProduktionsDashboard' },
      { title: 'Beschaffungsvorbereitung',file: 'readiness.html',            form: 'Form_ReadinessWorkbench' },
    ],
  },
  {
    key: 'einkauf', label: 'Einkauf', icon: '🛒',
    pages: [
      { title: 'Bestellungen',       file: 'purchase-order.html',   form: 'Form_PurchaseOrder' },
      { title: 'Angebote',           file: 'supplier-quotes.html',  form: 'Form_SupplierQuotes' },
      { title: 'Rechnungen',         file: 'supplier-invoices.html',form: 'Form_SupplierInvoices' },
      { title: 'Anfragen (RFQ)',     file: 'rfq.html',              form: 'Form_RfqVerwaltung' },
      { title: 'Bestellverfolgung',  file: 'po-tracking.html',      live: true },
    ],
  },
  {
    key: 'lager', label: 'Lager', icon: '📦',
    pages: [
      { title: 'Wareneingang', file: 'receiving.html', form: 'Form_Wareneingang' },
      { title: 'Prüfung & QS', file: 'qc.html',        form: 'Form_InspektionQC' },
      { title: 'Einlagern',    file: 'putaway.html',    form: 'Form_Einlagern' },
    ],
  },
  {
    key: 'prozesse', label: 'Prozesse', icon: '🔄',
    pages: [
      { title: 'Firmen', file: 'companies.html', form: 'Form_CrmUnternehmen' },
    ],
  },
  {
    key: 'admin', label: 'Admin', icon: '🔧',
    pages: [
      { title: 'Kontakte', file: 'contacts.html', form: 'Form_CrmKontakte' },
      { title: 'Projekte', file: 'projects.html', form: 'Form_ProjektVerwaltung' },
      { title: 'Aufgaben', file: 'tasks.html',    live: true },
    ],
  },
];

interface Props {
  onNavigate: (path: string) => void;
}

export function PdmOverview({ onNavigate }: Props) {
  return (
    <div className="pdm-overview">
      {PDM_GROUPS.map(group => (
        <section key={group.key} className="pdm-silo">
          <div className="pdm-silo-head">
            <span className="pdm-silo-icon">{group.icon}</span>
            <h2 className="pdm-silo-title">{group.label}</h2>
            <span className="pdm-silo-count">{group.pages.length}</span>
          </div>
          <div className="pdm-silo-grid">
            {group.pages.map(page => (
              <button
                key={page.file}
                className={`pdm-silo-card ${page.live ? 'pdm-silo-card--live' : ''}`}
                onClick={() => onNavigate(`/pdm/${page.file}`)}
              >
                <span className="pdm-silo-card-title">{page.title}</span>
                {page.form && <span className="pdm-silo-card-form">{page.form}</span>}
                <span className={`pdm-silo-badge ${page.live ? 'pdm-silo-badge--live' : ''}`}>
                  {page.live ? 'Live' : 'Vorbereitet'}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
