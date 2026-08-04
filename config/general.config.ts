import { BRAND } from './brand';

const generalSettings = {
  purchaseLink: `${BRAND.urls.marketing}/pricing`,
  docsLink: BRAND.urls.docs,
  licenseLink: `${BRAND.urls.marketing}/terms-of-service`,
  devsLink: BRAND.urls.docs,
  faqLink: `${BRAND.urls.marketing}/help`,
  aboutLink: BRAND.urls.marketing,
  supportLink: `mailto:${BRAND.email.support}`,
};

export { generalSettings };
