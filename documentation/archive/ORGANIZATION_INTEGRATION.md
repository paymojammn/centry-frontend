# Organization Management Integration

Complete backend integration for organization management with Metronic-styled frontend components.

## 🎯 Features

### Backend Integration
- ✅ Full Django REST API integration
- ✅ Organization CRUD operations
- ✅ Member management
- ✅ Organization statistics
- ✅ Invitation system
- ✅ Role-based permissions
- ✅ Multi-tenancy support

### Frontend Components
- ✅ Organization list page with search
- ✅ Detailed organization view
- ✅ Member management interface
- ✅ Statistics dashboard
- ✅ Metronic styling with Inter font
- ✅ Responsive design
- ✅ Loading states and error handling

## 📁 File Structure

```
centry-frontend/
├── lib/
│   ├── api.ts                      # Base API client
│   └── organization-api.ts         # Organization-specific API calls
├── hooks/
│   └── use-organization.ts         # React Query hooks for data fetching
├── types/
│   └── organization.ts             # TypeScript interfaces
└── app/(layouts)/layout-1/organizations/
    ├── page.tsx                    # Organizations list
    └── [id]/page.tsx              # Organization details
```

## 🚀 Getting Started

### 1. Environment Setup

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Update the API URL if needed:
```
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### 2. Backend Setup

Ensure your Django backend is running:

```bash
cd centry-backend
python manage.py runserver
```

### 3. Frontend Setup

```bash
cd centry-frontend
npm install
npm run dev
```

## 📡 API Endpoints

### Organizations
```typescript
GET    /erp/organizations/              // List all organizations
GET    /erp/organizations/{id}/         // Get organization details
POST   /erp/organizations/              // Create organization
PATCH  /erp/organizations/{id}/         // Update organization
DELETE /erp/organizations/{id}/         // Delete organization
GET    /erp/organizations/{id}/members/ // Get members
GET    /erp/organizations/{id}/stats/   // Get statistics
```

### Memberships
```typescript
GET    /memberships/              // List memberships
POST   /memberships/{id}/activate/    // Activate membership
POST   /memberships/{id}/deactivate/  // Deactivate membership
```

### Invitations
```typescript
GET    /invitations/              // List invitations
POST   /invitations/              // Send invitation
POST   /invitations/{id}/resend/  // Resend invitation
POST   /invitations/accept/       // Accept invitation
```

## 🎨 Component Usage

### Using Organization Hooks

```tsx
import { useOrganizations, useOrganization } from '@/hooks/use-organization';

function MyComponent() {
  // Get all organizations
  const { data, isLoading } = useOrganizations();
  
  // Get specific organization
  const { data: org } = useOrganization('org-id');
  
  // Get organization members
  const { data: members } = useOrganizationMembers('org-id');
  
  // Get organization stats
  const { data: stats } = useOrganizationStats('org-id');
}
```

### Creating Organizations

```tsx
import { useCreateOrganization } from '@/hooks/use-organization';

function CreateOrgForm() {
  const createOrg = useCreateOrganization();
  
  const handleSubmit = async (data) => {
    await createOrg.mutateAsync({
      name: 'My Company',
      slug: 'my-company',
      primary_currency: 'USD',
      industry: 'Technology',
    });
  };
}
```

## 🎭 Styling

All components use:
- **Metronic design system**
- **Inter font** (Metronic standard)
- **Tailwind CSS** for utility classes
- **shadcn/ui** components
- **Responsive breakpoints**

### Key Styling Classes

```tsx
// Font
className="font-inter"

// Cards with hover effects
className="hover:shadow-lg transition-shadow duration-200"

// Metronic-style badges
<Badge variant="default">Admin</Badge>
<Badge variant="outline">Member</Badge>
```

## 🔐 Authentication

The API client automatically includes JWT tokens from localStorage:

```typescript
// Set token after login
import { setAuthToken } from '@/lib/api';
setAuthToken('your-jwt-token');

// Clear token on logout
import { clearAuthToken } from '@/lib/api';
clearAuthToken();
```

## 📊 Data Flow

```
User Action
    ↓
React Component
    ↓
Custom Hook (use-organization.ts)
    ↓
API Service (organization-api.ts)
    ↓
Base API Client (api.ts)
    ↓
Django Backend
```

## 🎯 Features by Page

### Organizations List (`/organizations`)
- ✅ Grid view of all organizations
- ✅ Search functionality
- ✅ Create new organization button
- ✅ Quick stats (members, connections)
- ✅ Navigation to details page

### Organization Details (`/organizations/[id]`)
- ✅ Overview tab with organization info
- ✅ Members tab with team management
- ✅ Settings tab (placeholder)
- ✅ Statistics cards (members, connections, imports, transactions)
- ✅ Quick actions menu
- ✅ Member role badges
- ✅ Activity status indicators

## 🛠️ Customization

### Adding New API Endpoints

1. Add types to `types/organization.ts`
2. Add API function to `lib/organization-api.ts`
3. Add hook to `hooks/use-organization.ts`
4. Use in components

Example:
```typescript
// 1. Type
export interface OrganizationReport {
  id: string;
  name: string;
  data: any;
}

// 2. API Function
export async function getOrganizationReports(orgId: string) {
  return get<OrganizationReport[]>(`/erp/organizations/${orgId}/reports/`);
}

// 3. Hook
export function useOrganizationReports(orgId: string) {
  return useQuery({
    queryKey: ['organization', orgId, 'reports'],
    queryFn: () => getOrganizationReports(orgId),
  });
}

// 4. Usage
const { data: reports } = useOrganizationReports(orgId);
```

## 🐛 Error Handling

All API calls include automatic error handling:

```tsx
const { data, isLoading, error } = useOrganizations();

if (error) {
  return <ErrorComponent message={error.message} />;
}
```

## 📱 Responsive Design

All components are fully responsive:
- Mobile: Single column layout
- Tablet: 2 column grid
- Desktop: 3-4 column grid

## 🚦 Next Steps

1. ✅ Backend integration complete
2. ✅ Organization display implemented
3. ⏳ Add organization creation form
4. ⏳ Add member invitation flow
5. ⏳ Add organization settings page
6. ⏳ Add role management interface
7. ⏳ Add permission management

## 📝 Notes

- All data is cached using React Query
- Automatic refetching on mutations
- Optimistic updates supported
- TypeScript throughout for type safety
- Follows Metronic design patterns

## 🤝 Backend Requirements

Ensure your Django backend has:
- CORS configured for your frontend domain
- JWT authentication enabled
- Organization models migrated
- API endpoints accessible

## 📚 Related Documentation

- [Django Backend API Docs](../centry-backend/documentation/API_DOCUMENTATION.md)
- [Metronic Next.js Docs](https://docs.keenthemes.com/metronic-nextjs)
- [React Query Docs](https://tanstack.com/query/latest)
