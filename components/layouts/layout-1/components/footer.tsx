import { generalSettings } from '@/config/general.config';
import { BRAND } from '@/config/brand';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-center md:justify-between items-center gap-3 py-5">
          <div className="flex order-2 md:order-1  gap-2 font-normal text-sm">
            <span className="text-muted-foreground">{currentYear} &copy;</span>
            <a
              href={generalSettings.websiteLink}
              target="_blank"
              className="text-secondary-foreground hover:text-primary"
            >
              {BRAND.legalName}
            </a>
          </div>
          <nav className="flex order-1 md:order-2 gap-4 font-normal text-sm text-muted-foreground">
            <a href={generalSettings.docsLink} className="hover:text-primary">
              Docs
            </a>
            <a
              href={`mailto:${generalSettings.supportEmail}`}
              className="hover:text-primary"
            >
              Support
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
