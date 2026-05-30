import type { Lang } from '../../components/Banner/Banner';
import './PdmOverview.css';

type I18n = { de: string; en: string; hu: string };
type PdmPage = { titles: I18n; file: string; form?: string; live?: boolean };
type PdmGroup = { key: string; titles: I18n; icon: string; pages: PdmPage[] };

const PDM_GROUPS: PdmGroup[] = [
  {
    key: 'engineering', icon: '⚙️',
    titles: { de: 'Entwicklung', en: 'Engineering', hu: 'Fejlesztés' },
    pages: [
      { titles: { de: 'Objekte',        en: 'Objects',      hu: 'Objektumok'      }, file: 'objects.html',    live: true },
      { titles: { de: 'Stückliste',     en: 'BOM',          hu: 'Darabjegyzék'    }, file: 'bom.html',        live: true },
      { titles: { de: 'Objekt anlegen', en: 'Create Object', hu: 'Obj. létrehozás' }, file: 'new-object.html', live: true },
    ],
  },
  {
    key: 'planung', icon: '📋',
    titles: { de: 'Planung', en: 'Planning', hu: 'Tervezés' },
    pages: [
      { titles: { de: 'Fertigungsauftrag',        en: 'Production Order',     hu: 'Gyártási megbízás'      }, file: 'production-order.html',     live: true },
      { titles: { de: 'Auftragsübersicht',         en: 'Order Overview',       hu: 'Rendelés áttekintés'    }, file: 'orders.html',               live: true },
      { titles: { de: 'Produktionsübersicht',      en: 'Production Dashboard', hu: 'Gyártási áttekintés'    }, file: 'production-dashboard.html', live: true },
      { titles: { de: 'Beschaffungsvorbereitung',  en: 'Readiness Workbench',  hu: 'Beszerzési előkészítés' }, file: 'readiness.html',            live: true },
    ],
  },
  {
    key: 'einkauf', icon: '🛒',
    titles: { de: 'Einkauf', en: 'Purchasing', hu: 'Beszerzés' },
    pages: [
      { titles: { de: 'Bestellungen',      en: 'Purchase Orders',  hu: 'Rendelések'        }, file: 'purchase-order.html',    live: true },
      { titles: { de: 'Angebote',          en: 'Supplier Quotes',  hu: 'Ajánlatok'         }, file: 'supplier-quotes.html',   live: true },
      { titles: { de: 'Rechnungen',        en: 'Invoices',         hu: 'Számlák'           }, file: 'supplier-invoices.html', live: true },
      { titles: { de: 'Anfragen (RFQ)',    en: 'RFQ Management',   hu: 'Ajánlatkérések'    }, file: 'rfq.html',               live: true },
      { titles: { de: 'Bestellverfolgung', en: 'PO Tracking',      hu: 'Rendelés követés'  }, file: 'po-tracking.html',       live: true },
    ],
  },
  {
    key: 'lager', icon: '📦',
    titles: { de: 'Lager', en: 'Warehouse', hu: 'Raktár' },
    pages: [
      { titles: { de: 'Wareneingang', en: 'Goods Receiving', hu: 'Áruátvétel'  }, file: 'receiving.html', live: true },
      { titles: { de: 'Prüfung & QS', en: 'Inspection & QC', hu: 'Ellenőrzés'  }, file: 'qc.html',        live: true },
      { titles: { de: 'Einlagern',    en: 'Putaway',         hu: 'Betárolás'   }, file: 'putaway.html',   live: true },
    ],
  },
  {
    key: 'prozesse', icon: '🔄',
    titles: { de: 'Prozesse', en: 'Processes', hu: 'Folyamatok' },
    pages: [
      { titles: { de: 'Firmen', en: 'Companies', hu: 'Cégek' }, file: 'companies.html', live: true },
    ],
  },
  {
    key: 'admin', icon: '🔧',
    titles: { de: 'Admin', en: 'Admin', hu: 'Admin' },
    pages: [
      { titles: { de: 'Kontakte', en: 'Contacts', hu: 'Kapcsolatok' }, file: 'contacts.html', live: true },
      { titles: { de: 'Projekte', en: 'Projects',  hu: 'Projektek'  }, file: 'projects.html', live: true },
      { titles: { de: 'Aufgaben', en: 'Tasks',     hu: 'Feladatok'  }, file: 'tasks.html',    live: true },
    ],
  },
];

const BADGE: Record<Lang, { live: string; prep: string }> = {
  de: { live: 'Live', prep: 'Vor' },
  en: { live: 'Live', prep: 'Prep' },
  hu: { live: 'Élő',  prep: 'Előkész' },
};

interface Props {
  onNavigate: (path: string) => void;
  lang: Lang;
}

export function PdmOverview({ onNavigate, lang }: Props) {
  const t = (i: I18n) => i[lang] || i.de;

  return (
    <div className="pdm-overview">
      {PDM_GROUPS.map(group => (
        <section key={group.key} className="pdm-silo">
          <div className="pdm-silo-head">
            <span className="pdm-silo-icon">{group.icon}</span>
            <h2 className="pdm-silo-title">{t(group.titles)}</h2>
            <span className="pdm-silo-count">{group.pages.length}</span>
          </div>
          <div className="pdm-silo-grid">
            {group.pages.map(page => (
              <button
                key={page.file}
                className={`pdm-silo-card ${page.live ? 'pdm-silo-card--live' : ''}`}
                onClick={() => onNavigate(`/pdm/${page.file}`)}
              >
                <div className="pdm-silo-card-body">
                  <span className="pdm-silo-card-title">{t(page.titles)}</span>
                  {page.form && <span className="pdm-silo-card-form">{page.form}</span>}
                </div>
                <span className={`pdm-silo-badge ${page.live ? 'pdm-silo-badge--live' : ''}`}>
                  {page.live ? BADGE[lang].live : BADGE[lang].prep}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
