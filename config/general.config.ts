import { BRAND } from './brand';

// Company links shown in the shell (footer). The old values were Metronic
// template leftovers (Envato purchase link, keenthemes.com) rendered as dead
// or third-party links in our footer. What survives reads from the brand
// layer, so a re-skin cannot leave a stale domain in the footer.
const generalSettings = {
  websiteLink: BRAND.urls.marketing,
  // Relative on purpose: this app serves the checkout docs itself, so the
  // link stays inside whichever deployment the user is already on.
  docsLink: '/docs',
  supportEmail: BRAND.email.support,
};

export { generalSettings };
