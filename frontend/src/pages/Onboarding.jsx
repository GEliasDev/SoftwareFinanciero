import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, CreditCard, Landmark, Target, CheckCircle2, ArrowRight, ArrowLeft, Repeat } from 'lucide-react';
import { BrandMark } from '../components/ui/BrandMark';
import { AuthService } from '../services/authService';

const STEPS = [
  {
    id: 'welcome',
    title: '¡Bienvenido a Debti!',
    subtitle: 'Tu asistente de finanzas personales',
    description: 'En 3 pasos te explicamos cómo sacarle el máximo provecho. Toma menos de 2 minutos.',
    icon: null,
    cta: 'Empezar',
    skip: false,
  },
  {
    id: 'income',
    title: 'Registra tus ingresos',
    subtitle: 'El punto de partida',
    description: 'Agrega tus fuentes de ingreso mensual (salario, arriendos, freelance…). Sin esto no podemos calcular tu dinero libre.',
    icon: Wallet,
    color: 'var(--pos-600)',
    bg: 'var(--pos-50)',
    cta: 'Agregar ingreso',
    action: '/income/new',
    skip: true,
  },
  {
    id: 'obligations',
    title: 'Agrega tus compromisos',
    subtitle: 'Tarjetas, créditos o suscripciones',
    description: 'Registra las deudas y pagos recurrentes que tienes cada mes para ver en qué se va tu dinero.',
    icon: CreditCard,
    color: 'var(--brand-600)',
    bg: 'var(--brand-50)',
    cta: 'Ver opciones',
    options: [
      { label: 'Tarjeta de crédito', path: '/credit-cards/new', Icon: CreditCard },
      { label: 'Crédito bancario',   path: '/bank-credits/new', Icon: Landmark   },
      { label: 'Suscripción',        path: '/subscriptions/new',Icon: Repeat     },
    ],
    skip: true,
  },
  {
    id: 'savings',
    title: 'Crea una meta de ahorro',
    subtitle: 'Opcional pero muy recomendado',
    description: 'Define una meta (fondo de emergencia, vacaciones, carro…) y Debti te dirá cuánto debes apartar cada mes.',
    icon: Target,
    color: '#7C3AED',
    bg: 'rgba(124,58,237,0.08)',
    cta: 'Crear meta',
    action: '/savings/new',
    skip: true,
  },
];

export const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const user = AuthService.getCurrentUser();
  const firstName = user?.primerNombre || user?.name?.split(' ')[0] || 'allí';

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  const finish = () => {
    localStorage.removeItem('debti-onboarding');
    navigate('/');
  };

  const goAction = (path) => {
    localStorage.removeItem('debti-onboarding');
    navigate(path);
  };

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px 16px',
    }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
        <BrandMark size={44} />
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>Debti</span>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 32 }}>
        {STEPS.map((_, i) => (
          <div key={i} style={{
            width: i === step ? 24 : 8, height: 8,
            borderRadius: 99,
            background: i === step ? 'var(--brand-600)' : i < step ? 'var(--brand-200)' : 'var(--border)',
            transition: 'width 0.25s ease, background 0.25s ease',
          }} />
        ))}
      </div>

      {/* Card */}
      <div className="card animate-fade-in" style={{ width: '100%', maxWidth: 460, padding: '2rem' }}>

        {/* Icon */}
        {current.icon && (
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: current.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 20,
          }}>
            <current.icon size={28} style={{ color: current.color }} />
          </div>
        )}

        {/* Welcome ilustration */}
        {step === 0 && (
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {[
              { Icon: Wallet,    c: 'var(--pos-600)',  b: 'var(--pos-50)'   },
              { Icon: CreditCard,c: 'var(--brand-600)',b: 'var(--brand-50)' },
              { Icon: Target,    c: '#7C3AED',         b: 'rgba(124,58,237,0.08)' },
              { Icon: CheckCircle2, c: 'var(--pos-700)',b: 'var(--pos-50)'  },
            ].map(({ Icon, c, b }, i) => (
              <div key={i} style={{ width: 44, height: 44, borderRadius: 12, background: b, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={20} style={{ color: c }} />
              </div>
            ))}
          </div>
        )}

        <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 6, letterSpacing: '-0.02em' }}>
          {step === 0 ? `Hola, ${firstName} 👋` : current.title}
        </h2>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--brand-600)', marginBottom: 12 }}>
          {current.subtitle}
        </p>
        <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 28 }}>
          {current.description}
        </p>

        {/* Options (step obligaciones) */}
        {current.options && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {current.options.map(({ label, path, Icon }) => (
              <button
                key={path}
                className="btn btn-secondary"
                style={{ justifyContent: 'flex-start', gap: 12, height: 44 }}
                onClick={() => goAction(path)}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {step > 0 && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setStep(s => s - 1)}
            >
              <ArrowLeft size={14} /> Atrás
            </button>
          )}
          <div style={{ flex: 1 }} />
          {current.skip && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-3)' }}
              onClick={isLast ? finish : () => setStep(s => s + 1)}
            >
              {isLast ? 'Finalizar' : 'Saltar'}
            </button>
          )}
          {!current.options && (
            <button
              className="btn btn-primary"
              onClick={() => {
                if (step === 0) { setStep(1); return; }
                if (current.action) { goAction(current.action); return; }
                if (isLast) { finish(); return; }
                setStep(s => s + 1);
              }}
            >
              {current.cta} <ArrowRight size={14} />
            </button>
          )}
          {current.options && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ color: 'var(--text-3)' }}
              onClick={isLast ? finish : () => setStep(s => s + 1)}
            >
              {isLast ? 'Ir al Dashboard' : 'Continuar'} <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Step counter */}
      <p style={{ marginTop: 20, fontSize: 12, color: 'var(--text-3)' }}>
        Paso {step + 1} de {STEPS.length}
      </p>
    </div>
  );
};
