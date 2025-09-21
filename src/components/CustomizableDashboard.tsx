import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, Eye, EyeOff } from "lucide-react";
import { useDashboardPreferences, WidgetConfig } from "@/hooks/useDashboardPreferences";
import Dashboard from "./Dashboard";
import { ExpenseAnalytics } from "./ExpenseAnalytics";
import { TaskWidget } from "./widgets/TaskWidget";
import { WeatherWidget } from "./widgets/WeatherWidget";
import { QuoteWidget } from "./widgets/QuoteWidget";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface CustomizableDashboardProps {
  events: any[];
  persons: any[];
  onEditEvent?: (event: any) => void;
}

export function CustomizableDashboard({ events, persons, onEditEvent }: CustomizableDashboardProps) {
  const { preferences, loading, updateWidgetLayout } = useDashboardPreferences();
  const [editMode, setEditMode] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(preferences.widget_layout);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Update positions
    const updatedItems = items.map((item, index) => ({
      ...item,
      position: index
    }));

    updateWidgetLayout(updatedItems);
  };

  const toggleWidgetVisibility = (widgetId: string) => {
    const updatedLayout = preferences.widget_layout.map(widget =>
      widget.id === widgetId
        ? { ...widget, visible: !widget.visible }
        : widget
    );
    updateWidgetLayout(updatedLayout);
  };

  const renderWidget = (widget: WidgetConfig) => {
    if (!widget.visible && !editMode) return null;

    const getWidgetContent = () => {
      switch (widget.type) {
        case 'stats':
          return <Dashboard events={events} persons={persons} onEditEvent={onEditEvent} />;
        case 'analytics':
          return <ExpenseAnalytics />;
        case 'tasks':
          return <TaskWidget events={events} />;
        case 'weather':
          return <WeatherWidget />;
        case 'quote':
          return <QuoteWidget />;
        default:
          return <div>Widget non reconnu</div>;
      }
    };

    const getSizeClass = () => {
      switch (widget.size) {
        case 'small':
          return 'col-span-1';
        case 'medium':
          return 'col-span-1 md:col-span-2';
        case 'large':
          return 'col-span-1 md:col-span-2 lg:col-span-3';
        default:
          return 'col-span-1';
      }
    };

    return (
      <div className={`${getSizeClass()} ${!widget.visible ? 'opacity-50' : ''}`}>
        {editMode && (
          <div className="flex items-center justify-between mb-2 p-2 bg-muted rounded">
            <span className="text-sm font-medium">{widget.type}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleWidgetVisibility(widget.id)}
            >
              {widget.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        )}
        {getWidgetContent()}
      </div>
    );
  };

  const visibleWidgets = preferences.widget_layout
    .filter(w => w.visible || editMode)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Dashboard Personnalisé</h2>
        <div className="flex items-center space-x-2">
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {editMode ? "Terminer" : "Personnaliser"}
          </Button>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm">
                Paramètres
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Paramètres du Dashboard</DialogTitle>
                <DialogDescription>
                  Configurez la visibilité et l'ordre de vos widgets
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {preferences.widget_layout.map((widget) => (
                  <div key={widget.id} className="flex items-center justify-between">
                    <Label htmlFor={widget.id} className="capitalize">
                      {widget.type}
                    </Label>
                    <Switch
                      id={widget.id}
                      checked={widget.visible}
                      onCheckedChange={() => toggleWidgetVisibility(widget.id)}
                    />
                  </div>
                ))}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {editMode && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground mb-2">
            Mode édition activé : Glissez-déposez les widgets pour les réorganiser
          </p>
        </div>
      )}

      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="dashboard" direction="horizontal">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {visibleWidgets.map((widget, index) => (
                <Draggable
                  key={widget.id}
                  draggableId={widget.id}
                  index={index}
                  isDragDisabled={!editMode}
                >
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''} transition-transform`}
                    >
                      {renderWidget(widget)}
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}