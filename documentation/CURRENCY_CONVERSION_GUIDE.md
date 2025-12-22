# Currency Conversion Implementation Guide

## Overview

This implementation adds multi-provider currency conversion support to Centry, allowing payments in different currencies with real-time exchange rates from providers like XE Currency Data API, Fixer.io, CurrencyAPI.com, and others.

## Features

✅ **Multi-Provider Support**: Automatic fallback between multiple currency conversion APIs
✅ **Real-Time Exchange Rates**: Live rates with caching for performance
✅ **Conversion Tracking**: Complete audit trail of all currency conversions
✅ **Frontend Integration**: React hooks and components for seamless UI integration
✅ **Smart Caching**: 1-hour rate caching with force refresh option
✅ **Margin Support**: Add markup to exchange rates for payment processors

## Backend Setup

### 1. Run Migrations

```bash
cd centry-backend
python manage.py makemigrations payments wallet
python manage.py migrate
```

### 2. Configure Currency Providers

Add at least one provider through Django Admin:

**XE Currency Data (Recommended)**
- Name: `xe`
- Display Name: XE Currency Data
- API Endpoint: `https://xecdapi.xe.com/v1`
- API Key: Your XE API credentials (Basic Auth format)
- Priority: 100
- Rate Limit: Based on your plan

**Fixer.io**
- Name: `fixer`
- Display Name: Fixer.io
- API Endpoint: `http://data.fixer.io/api`
- API Key: Your Fixer access key
- Priority: 90

**CurrencyAPI.com**
- Name: `currencyapi`
- Display Name: CurrencyAPI
- API Endpoint: `https://api.currencyapi.com/v3`
- API Key: Your CurrencyAPI key
- Priority: 80

**ExchangeRate-API (Free Tier Available)**
- Name: `exchangerate`
- Display Name: ExchangeRate-API
- API Endpoint: `https://v6.exchangerate-api.com/v6/{your-key}`
- Priority: 70

### 3. Add Supported Currencies

Navigate to Django Admin → Supported Currencies and add:

```
USD - United States Dollar - $
EUR - Euro - €
GBP - British Pound - £
UGX - Ugandan Shilling - UGX
KES - Kenyan Shilling - KSh
TZS - Tanzanian Shilling - TSh
RWF - Rwandan Franc - RWF
ZAR - South African Rand - R
```

### 4. Update URL Configuration

In `baihu/urls.py`, include the currency conversion URLs:

```python
from django.urls import path, include

urlpatterns = [
    # ... existing patterns
    path('api/payments/', include('payments.api_urls_currency')),
]
```

### 5. Register Models in Admin

In `payments/admin.py`:

```python
from .admin_currency import (
    CurrencyConversionProviderAdmin,
    ExchangeRateAdmin,
    ConversionTransactionAdmin,
    SupportedCurrencyAdmin
)

# Models are auto-registered via decorators in admin_currency.py
```

## Frontend Setup

### 1. API Endpoints Available

```typescript
// Get exchange rate
POST /api/payments/currency/conversion/get_rate/
{
  "from_currency": "USD",
  "to_currency": "UGX",
  "force_refresh": false
}

// Convert amount
POST /api/payments/currency/conversion/convert/
{
  "amount": "100.00",
  "from_currency": "USD",
  "to_currency": "UGX",
  "margin": "0.02"  // Optional 2% markup
}

// Get supported currencies
GET /api/payments/currency/conversion/supported_currencies/

// Get conversion history
GET /api/payments/currency/conversion/history/?organization_id=1
```

### 2. Using the Currency Conversion Hook

```typescript
import {
  useExchangeRate,
  useConvertAmount,
  useSupportedCurrencies,
} from '@/hooks/use-currency-conversion';

function MyComponent() {
  // Get live exchange rate
  const { data: rate, isLoading } = useExchangeRate('USD', 'UGX');
  
  // Convert amount with mutation
  const convertMutation = useConvertAmount();
  
  const handleConvert = async () => {
    const result = await convertMutation.mutateAsync({
      amount: '100.00',
      from_currency: 'USD',
      to_currency: 'UGX',
      margin: 0.02
    });
    
    console.log(result.converted_amount);
  };
  
  // Get supported currencies
  const { data: currencies } = useSupportedCurrencies();
}
```

### 3. Using the Currency Selector Component

```typescript
import { CurrencyConversionSelector } from '@/components/currency/CurrencyConversionSelector';

function PaymentModal() {
  const [conversionData, setConversionData] = useState(null);
  
  return (
    <CurrencyConversionSelector
      fromCurrency="USD"
      toCurrency="UGX"
      amount={1000}
      onConversionChange={(data) => {
        setConversionData(data);
        // Use data.convertedAmount in payment processing
      }}
      margin={0.02}  // Optional 2% markup
      showSelector={true}
    />
  );
}
```

## Integration with Bill Payments

### PayBillsModal Integration

The currency selector can be integrated into the payment flow:

```typescript
// In PayBillsModal.tsx
import { CurrencyConversionSelector } from '@/components/currency/CurrencyConversionSelector';

// Add state for conversion
const [conversionData, setConversionData] = useState<Record<number, any>>({});

// For each bill with different currency:
<CurrencyConversionSelector
  fromCurrency={bill.currency_code}
  toCurrency={paymentMethodCurrency}
  amount={paymentAmounts.get(bill.id) || bill.amount_due}
  onConversionChange={(data) => {
    setConversionData(prev => ({
      ...prev,
      [bill.id]: data
    }));
  }}
/>

// When submitting payment, include conversion data
const paymentData = {
  bills: bills.map(bill => ({
    bill_id: bill.id.toString(),
    amount: paymentAmounts.get(bill.id) || bill.amount_due,
    original_currency: bill.currency_code,
    target_currency: paymentMethodCurrency,
    conversion_rate: conversionData[bill.id]?.rate,
    converted_amount: conversionData[bill.id]?.convertedAmount,
  })),
  // ... other payment data
};
```

## Environment Variables

Add to your `.env` files:

### Backend (.env)
```bash
# XE Currency Data
XE_API_KEY=your_xe_api_key
XE_API_ENDPOINT=https://xecdapi.xe.com/v1

# Fixer.io
FIXER_API_KEY=your_fixer_key

# CurrencyAPI
CURRENCYAPI_KEY=your_currencyapi_key

# Default margin for conversions (optional)
CURRENCY_CONVERSION_MARGIN=0.02  # 2%
```

### Frontend (.env.local)
```bash
NEXT_PUBLIC_DEFAULT_CURRENCY=UGX
```

## Testing

### Test Exchange Rate Retrieval
```bash
curl -X POST http://localhost:8000/api/payments/currency/conversion/get_rate/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"from_currency": "USD", "to_currency": "UGX"}'
```

### Test Amount Conversion
```bash
curl -X POST http://localhost:8000/api/payments/currency/conversion/convert/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount": "100", "from_currency": "USD", "to_currency": "UGX", "margin": "0.02"}'
```

## Monitoring

### Django Admin

1. **Currency Conversion Providers**: Monitor API usage and success rates
2. **Exchange Rates**: View historical rates and provider performance
3. **Conversion Transactions**: Audit trail of all conversions
4. **Supported Currencies**: Manage available currencies

### Key Metrics

- API calls per provider (tracked monthly)
- Provider success rates
- Average conversion amounts
- Most converted currency pairs
- Conversion fees collected

## Fallback Behavior

The system automatically falls back to alternative providers:

1. **Primary Provider** (highest priority) - Tried first
2. **Secondary Providers** - Tried in priority order if primary fails
3. **Recent Database Rate** - Used if all providers fail (max 24 hours old)
4. **Error Response** - Returns error if no rate available

## Rate Caching

- **Frontend Cache**: 5 minutes (React Query)
- **Backend Cache**: 1 hour (Django cache)
- **Force Refresh**: Available on demand

## Best Practices

1. **Set Up Multiple Providers**: Ensure high availability
2. **Monitor Rate Limits**: Check provider usage in admin
3. **Apply Margins Carefully**: Consider customer experience
4. **Update Rates Before Large Transactions**: Use force refresh
5. **Keep Audit Trail**: All conversions are logged
6. **Test with Small Amounts**: Verify rates before production

## Troubleshooting

### Rate Not Found
- Check provider API keys are valid
- Verify provider has remaining API calls
- Check currency codes are valid ISO 4217

### Slow Performance
- Verify caching is enabled
- Check network latency to provider APIs
- Consider increasing cache duration

### Incorrect Rates
- Force refresh to get latest rates
- Verify provider priority settings
- Check margin configuration

## Support

For XE Currency Data API:
- Documentation: https://www.xe.com/xecurrencydata/
- Support: https://www.xe.com/xecurrencydata/support/

For other providers, refer to their respective documentation.

## Future Enhancements

- [ ] Rate alerts for significant fluctuations
- [ ] Historical rate charts
- [ ] Batch conversion support
- [ ] Custom margin per currency pair
- [ ] Automated provider health checks
- [ ] Rate comparison across providers
- [ ] Forward contract support
