import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAIUsageLimit } from '@/hooks/useAIUsageLimit';
import { Sparkles, Crown, Zap } from 'lucide-react';

const AIUsageBadge = () => {
  const { usageInfo, loading } = useAIUsageLimit();

  if (loading || !usageInfo) {
    return null;
  }

  if (usageInfo.isUnlimited) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="bg-gradient-primary text-white border-primary">
              <Crown className="w-3 h-3 mr-1" />
              IA Illimitée
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>Compte {usageInfo.role === 'admin' ? 'Administrateur' : 'Premium'} - Générations IA illimitées</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const isLowUsage = usageInfo.remaining <= 1;
  const isNoUsage = usageInfo.remaining === 0;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="outline" 
            className={
              isNoUsage 
                ? "bg-destructive text-white border-destructive" 
                : isLowUsage 
                  ? "bg-yellow-500 text-white border-yellow-500"
                  : "bg-success text-white border-success"
            }
          >
            {isNoUsage ? (
              <Zap className="w-3 h-3 mr-1" />
            ) : (
              <Sparkles className="w-3 h-3 mr-1" />
            )}
            {isNoUsage ? 'Limite atteinte' : `${usageInfo.remaining} IA restantes`}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-semibold">Générations IA quotidiennes</p>
            <p>Utilisées: {usageInfo.used}/{usageInfo.dailyLimit}</p>
            <p>Restantes: {usageInfo.remaining}</p>
            {isNoUsage && (
              <p className="text-xs mt-1 text-muted-foreground">
                Réinitialisation à minuit
              </p>
            )}
            <p className="text-xs mt-1 text-muted-foreground">
              Passez Premium pour un accès illimité
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AIUsageBadge;