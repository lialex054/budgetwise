import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CircleDollarSign } from 'lucide-react';

// Props:
// - onNameSubmit: function(name) - Called when the user submits their name
export function LandingStep({ onNameSubmit }) {
  const [name, setName] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault(); // Prevent default form submission
    onNameSubmit(name);
  };

  return (
    // Center the card vertically and horizontally in the screen
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-[350px]">
        <CardHeader className="items-center text-center">
           <CircleDollarSign className="w-10 h-10 text-blue-600 mb-2" />
          <CardTitle>Welcome to BudgetWise!</CardTitle>
          <CardDescription>Let's get started. What should we call you?</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <div className="grid w-full items-center gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>
          </form>
        </CardContent>
        <CardFooter>
          {/* Use the form's submit handler indirectly */}
          <Button className="w-full" onClick={handleSubmit} disabled={!name.trim()}>
            Continue
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}