# 📱 Mobile-Optimized Job Application Components

Reusable components for building mobile-optimized job application forms.

## 🎯 Features

- ✅ **Dynamic Fluid Sizing** - All components use CSS `clamp()` for smooth scaling
- ✅ **Touch-Friendly** - All interactive elements ≥ 44px
- ✅ **No iOS Zoom** - All text ≥ 16px
- ✅ **Mobile Keyboards** - Proper `inputMode` attributes
- ✅ **Consistent Styling** - Same look and feel across all steps
- ✅ **Accessibility** - Proper labels, ARIA attributes, keyboard navigation

---

## 📦 Components

### 1. MobileInput
Mobile-optimized input field with dynamic sizing and keyboard support.

```tsx
import { MobileInput } from './mobile-optimized'

<MobileInput
  id="email"
  type="email"
  mobileKeyboard="email"
  value={formData.email}
  onChange={(e) => handleChange('email', e.target.value)}
  error={!!errors.email}
  placeholder="your@email.com"
  autoComplete="email"
/>
```

**Props:**
- `mobileKeyboard`: 'tel' | 'email' | 'numeric' | 'decimal' | 'url' | 'search'
- `error`: boolean - Shows red border
- All standard input props

**Sizing:**
- Height: 44px - 48px (clamp)
- Font: 16px (always ≥ 16px)

---

### 2. MobileLabel
Mobile-optimized label with dynamic sizing and required indicator.

```tsx
import { MobileLabel } from './mobile-optimized'

<MobileLabel htmlFor="email" required>
  Email Address
</MobileLabel>
```

**Props:**
- `required`: boolean - Shows red asterisk
- `variant`: 'default' | 'semibold'
- All standard label props

**Sizing:**
- Font: 14px - 16px (clamp)

---

### 3. MobileSelect
Mobile-optimized select dropdown with dynamic sizing.

```tsx
import { MobileSelect, MobileSelectItem } from './mobile-optimized'

<MobileSelect
  value={formData.state}
  onValueChange={(value) => handleChange('state', value)}
  placeholder="Select state"
  error={!!errors.state}
>
  <MobileSelectItem value="CA">California</MobileSelectItem>
  <MobileSelectItem value="NY">New York</MobileSelectItem>
</MobileSelect>
```

**Props:**
- `error`: boolean - Shows red border
- `disabled`: boolean
- Standard select props

**Sizing:**
- Trigger height: 44px - 48px (clamp)
- Dropdown max-height: 60vh
- Item padding: 12px (py-3)

---

### 4. MobileRadioGroup
Card-style radio button group with hover and selected states.

```tsx
import { MobileRadioGroup } from './mobile-optimized'

<MobileRadioGroup
  value={formData.workAuth}
  onValueChange={(value) => handleChange('workAuth', value)}
  columns={2}
  options={[
    { value: 'yes', label: 'Yes', id: 'work_auth_yes' },
    { value: 'no', label: 'No', id: 'work_auth_no' }
  ]}
/>
```

**Props:**
- `options`: Array of { value, label, id }
- `columns`: 1 | 2 | 3 | 4 | 5
- Standard RadioGroup props

**Features:**
- Card-style buttons with borders
- Hover: Blue border + light blue background
- Selected: Solid blue border
- Full card clickable

**Sizing:**
- Min height: 44px
- Padding: 12px
- Font: 14px - 16px (clamp)

---

### 5. MobileTextarea
Mobile-optimized textarea with dynamic sizing.

```tsx
import { MobileTextarea } from './mobile-optimized'

<MobileTextarea
  id="comments"
  value={formData.comments}
  onChange={(e) => handleChange('comments', e.target.value)}
  error={!!errors.comments}
  placeholder="Enter your comments..."
  rows={4}
/>
```

**Props:**
- `error`: boolean - Shows red border
- All standard textarea props

**Sizing:**
- Font: 16px (always ≥ 16px)
- Padding: 12px - 16px (clamp)
- Min height: 96px - 128px (clamp)

---

### 6. MobileCheckbox
Mobile-optimized checkbox with touch-friendly container.

```tsx
import { MobileCheckbox } from './mobile-optimized'

<MobileCheckbox
  id="age_verify"
  checked={formData.ageVerified}
  onCheckedChange={(checked) => handleChange('ageVerified', checked)}
  label="I am 18 years or older"
  error={!!errors.ageVerified}
/>
```

**Props:**
- `id`: string
- `checked`: boolean
- `onCheckedChange`: (checked: boolean) => void
- `label`: string
- `error`: boolean

**Sizing:**
- Checkbox: 20px x 20px
- Container: ≥ 44px height
- Label font: 14px - 16px (clamp)

---

### 7. MobileErrorMessage
Consistent error message display.

```tsx
import { MobileErrorMessage } from './mobile-optimized'

<MobileErrorMessage>
  {errors.email}
</MobileErrorMessage>
```

**Sizing:**
- Font: 12px - 14px (clamp)
- Color: Red (#DC2626)

---

### 8. Layout Components

#### MobileFormSection
Wrapper for form sections with consistent spacing.

```tsx
import { MobileFormSection } from './mobile-optimized'

<MobileFormSection title="Contact Information">
  {/* Form fields */}
</MobileFormSection>
```

**Sizing:**
- Title: 18px - 24px (clamp)
- Spacing: 16px - 24px (clamp)

---

#### MobileFormField
Wrapper for individual form fields.

```tsx
import { MobileFormField } from './mobile-optimized'

<MobileFormField>
  <MobileLabel htmlFor="email" required>Email</MobileLabel>
  <MobileInput id="email" type="email" mobileKeyboard="email" />
  <MobileErrorMessage>{errors.email}</MobileErrorMessage>
</MobileFormField>
```

**Sizing:**
- Spacing: 8px - 12px (clamp)

---

#### MobileFormGrid
Responsive grid layout for form fields.

```tsx
import { MobileFormGrid } from './mobile-optimized'

<MobileFormGrid columns={2}>
  <MobileFormField>
    {/* Field 1 */}
  </MobileFormField>
  <MobileFormField>
    {/* Field 2 */}
  </MobileFormField>
</MobileFormGrid>
```

**Props:**
- `columns`: 1 | 2 | 3

**Behavior:**
- Mobile: Always 1 column
- Desktop: Specified number of columns
- Gap: 16px - 24px (clamp)

---

## 🚀 Complete Example

```tsx
import {
  MobileFormSection,
  MobileFormField,
  MobileFormGrid,
  MobileLabel,
  MobileInput,
  MobileSelect,
  MobileSelectItem,
  MobileRadioGroup,
  MobileCheckbox,
  MobileErrorMessage
} from './mobile-optimized'

function PersonalInfoForm() {
  return (
    <div className="space-y-[clamp(1.5rem,4vw,2rem)]">
      <MobileFormSection title="Personal Information">
        <MobileFormGrid columns={3}>
          <MobileFormField>
            <MobileLabel htmlFor="firstName" required>First Name</MobileLabel>
            <MobileInput
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange('firstName', e.target.value)}
              error={!!errors.firstName}
            />
            <MobileErrorMessage>{errors.firstName}</MobileErrorMessage>
          </MobileFormField>

          <MobileFormField>
            <MobileLabel htmlFor="lastName" required>Last Name</MobileLabel>
            <MobileInput
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange('lastName', e.target.value)}
              error={!!errors.lastName}
            />
            <MobileErrorMessage>{errors.lastName}</MobileErrorMessage>
          </MobileFormField>
        </MobileFormGrid>

        <MobileFormGrid columns={2}>
          <MobileFormField>
            <MobileLabel htmlFor="email" required>Email</MobileLabel>
            <MobileInput
              id="email"
              type="email"
              mobileKeyboard="email"
              autoComplete="email"
              value={formData.email}
              onChange={(e) => handleChange('email', e.target.value)}
              error={!!errors.email}
            />
            <MobileErrorMessage>{errors.email}</MobileErrorMessage>
          </MobileFormField>

          <MobileFormField>
            <MobileLabel htmlFor="phone" required>Phone</MobileLabel>
            <MobileInput
              id="phone"
              type="tel"
              mobileKeyboard="tel"
              autoComplete="tel"
              value={formData.phone}
              onChange={(e) => handleChange('phone', e.target.value)}
              error={!!errors.phone}
            />
            <MobileErrorMessage>{errors.phone}</MobileErrorMessage>
          </MobileFormField>
        </MobileFormGrid>
      </MobileFormSection>

      <MobileFormSection title="Work Authorization">
        <MobileFormField>
          <MobileLabel required>Are you authorized to work in the US?</MobileLabel>
          <MobileRadioGroup
            value={formData.workAuth}
            onValueChange={(value) => handleChange('workAuth', value)}
            columns={2}
            options={[
              { value: 'yes', label: 'Yes', id: 'work_yes' },
              { value: 'no', label: 'No', id: 'work_no' }
            ]}
          />
          <MobileErrorMessage>{errors.workAuth}</MobileErrorMessage>
        </MobileFormField>
      </MobileFormSection>
    </div>
  )
}
```

---

## ✅ Benefits

1. **Faster Development** - Reusable components reduce code duplication
2. **Consistency** - Same styling across all forms
3. **Maintainability** - Update once, applies everywhere
4. **Mobile-First** - Built for mobile from the ground up
5. **Accessibility** - Proper ARIA attributes and keyboard navigation
6. **Performance** - Optimized for smooth scaling

---

## 📊 Sizing Reference

| Component | Mobile | Desktop | Touch Target |
|-----------|--------|---------|--------------|
| Input | 44px | 48px | 44px+ |
| Select | 44px | 48px | 44px+ |
| Checkbox | 20px | 20px | 44px (container) |
| Radio | 20px | 20px | 44px (card) |
| Button | 44px | 48px | 44px+ |
| Label | 14px | 16px | N/A |
| Error | 12px | 14px | N/A |
| Heading | 18px | 24px | N/A |

---

## 🎯 Usage in Job Application Steps

Simply replace existing components with mobile-optimized versions:

**Before:**
```tsx
<Label>Email *</Label>
<Input type="email" />
{error && <p className="text-sm text-red-600">{error}</p>}
```

**After:**
```tsx
<MobileLabel htmlFor="email" required>Email</MobileLabel>
<MobileInput id="email" type="email" mobileKeyboard="email" />
<MobileErrorMessage>{error}</MobileErrorMessage>
```

---

**Created:** 2025-10-21  
**Version:** 1.0.0  
**Status:** ✅ Ready for use

