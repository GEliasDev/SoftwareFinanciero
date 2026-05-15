import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { SubscriptionService } from '../services/subscriptionService';
import { Repeat, CreditCard, TrendingUp, AlertCircle } from 'lucide-react';

export const Dashboard = () => {
  const [subSummary, setSubSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const summary = await SubscriptionService.getSummary();
        setSubSummary(summary);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, []);

  return (
    <div className="animate-fade-in">
      <h1 className="text-2xl mb-6">Panel de Control</h1>
      
      {loading ? (
        <p className="text-muted">Cargando resumen...</p>
      ) : (
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))' }}>
          
          <Card>
            <div className="flex items-center gap-4">
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
                <TrendingUp size={24} />
              </div>
              <div>
                <p className="text-muted text-sm">Gasto Mensual Estimado</p>
                <h3 className="text-2xl font-bold">
                  ${subSummary?.totalMonthlyExpense?.toLocaleString('es-CO') || '0'}
                </h3>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center gap-4">
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                <Repeat size={24} />
              </div>
              <div>
                <p className="text-muted text-sm">Suscripciones Activas</p>
                <h3 className="text-2xl font-bold">
                  {subSummary?.activeCount || '0'}
                </h3>
              </div>
            </div>
          </Card>
          
          <Card>
            <div className="flex items-center gap-4">
              <div style={{ padding: '1rem', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-muted text-sm">Vencen Pronto (7 días)</p>
                <h3 className="text-2xl font-bold">
                  {subSummary?.upcomingRenewals?.length || '0'}
                </h3>
              </div>
            </div>
          </Card>

        </div>
      )}

      {/* Additional sections like Recent Transactions can go here */}
      <div className="mt-6">
        <Card title="Próximos Vencimientos de Suscripciones">
          {subSummary?.upcomingRenewals?.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {subSummary.upcomingRenewals.map(sub => (
                <div key={sub._id} className="flex justify-between items-center" style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)' }}>
                  <div>
                    <h4 className="font-semibold">{sub.name}</h4>
                    <p className="text-sm text-muted">Vence el: {new Date(sub.nextRenewalDate).toLocaleDateString()}</p>
                  </div>
                  <div className="text-danger font-bold">
                    ${sub.cost?.toLocaleString('es-CO')}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted text-center py-4">No hay vencimientos próximos en los siguientes 7 días.</p>
          )}
        </Card>
      </div>
    </div>
  );
};
