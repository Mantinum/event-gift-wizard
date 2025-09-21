import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Calendar, Wallet, Users, Gift } from "lucide-react";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useExpenseAnalytics } from "@/hooks/useExpenseAnalytics";

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))', 'hsl(var(--destructive))'];

export function ExpenseAnalytics() {
  const { monthlyData, categoryData, summary, loading } = useExpenseAnalytics(6);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Analytics des Dépenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatCurrency = (value: number) => `${value.toFixed(0)}€`;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Budget Total</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalBudget)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.monthlyGrowth >= 0 ? (
                <span className="text-green-600 flex items-center">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +{summary.monthlyGrowth.toFixed(1)}% ce mois
                </span>
              ) : (
                <span className="text-red-600 flex items-center">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {summary.monthlyGrowth.toFixed(1)}% ce mois
                </span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Événements</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalEvents}</div>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(summary.averagePerEvent)} par événement
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dépensé</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalBudget > 0 ? (
                `${((summary.totalSpent / summary.totalBudget) * 100).toFixed(1)}% du budget`
              ) : (
                'Aucune donnée'
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Catégories</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categoryData.length}</div>
            <p className="text-xs text-muted-foreground">
              Types de relations
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="monthly" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="monthly">Évolution Mensuelle</TabsTrigger>
          <TabsTrigger value="categories">Par Catégorie</TabsTrigger>
          <TabsTrigger value="comparison">Comparaison</TabsTrigger>
        </TabsList>
        
        <TabsContent value="monthly" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Évolution des Budgets</CardTitle>
              <CardDescription>Budget alloué et dépenses estimées par mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value), ""]}
                    labelClassName="text-sm font-medium"
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="budget" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                    name="Budget Alloué"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="spent" 
                    stroke="hsl(var(--secondary))" 
                    strokeWidth={2}
                    name="Dépenses Estimées"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Répartition par Relation</CardTitle>
                <CardDescription>Pourcentage du budget par type de relation</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ category, percentage }) => `${category} (${percentage.toFixed(1)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="amount"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [formatCurrency(value), ""]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Catégories</CardTitle>
                <CardDescription>Classement des relations par budget alloué</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryData.slice(0, 5).map((category, index) => (
                  <div key={category.category} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge 
                        variant="outline" 
                        className="w-6 h-6 rounded-full p-0 flex items-center justify-center"
                        style={{ backgroundColor: COLORS[index % COLORS.length] + '20' }}
                      >
                        {index + 1}
                      </Badge>
                      <span className="font-medium">{category.category}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">{formatCurrency(category.amount)}</div>
                      <div className="text-xs text-muted-foreground">{category.count} événements</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budget vs Événements</CardTitle>
              <CardDescription>Nombre d'événements et budget total par mois</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis yAxisId="left" className="text-xs" />
                  <YAxis yAxisId="right" orientation="right" className="text-xs" />
                  <Tooltip 
                    formatter={(value: number, name: string) => [
                      name === 'events' ? value : formatCurrency(value), 
                      name === 'events' ? 'Événements' : 'Budget'
                    ]}
                    labelClassName="text-sm font-medium"
                  />
                  <Legend />
                  <Bar 
                    yAxisId="left" 
                    dataKey="budget" 
                    fill="hsl(var(--primary))" 
                    name="Budget (€)"
                  />
                  <Bar 
                    yAxisId="right" 
                    dataKey="events" 
                    fill="hsl(var(--secondary))" 
                    name="Événements"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}