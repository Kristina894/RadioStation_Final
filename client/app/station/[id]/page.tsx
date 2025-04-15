"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, MapPin, Mail, Phone, Radio, Loader2 } from "lucide-react"; // Added Loader2
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { BACKEND_URL, RAZORPAY_KEY_ID } from "@/constants/constans"; // Ensure these are correct

interface RJ {
  id: string;
  stationId: string; // Assuming this is ObjectId as string
  rjName: string;
  showName: string;
  showTiming: string;
}

interface AdvertisementSlot {
  id: string; // Assuming this is ObjectId as string
  stationId: string;
  rjId: string;
  slotTime: string; // Comes as string, convert to Date if needed for display formatting
  availabilityStatus: "AVAILABLE" | "BOOKED"; // Matches SlotStatus enum
  price: number; // Price in Rupees (Float)
}

// Interface matching RadioStation model
interface RadioStation {
  id: string; // Assuming this is ObjectId as string
  stationName: string;
  location: string;
  contactEmail: string;
  contactPhone: string;
  description: string | null;
  rjs: RJ[];
  advertisementSlots: AdvertisementSlot[];
}

// Interface matching relevant parts of User model
interface UserData {
  id: string; // Assuming this is ObjectId as string
  firstName: string;
  lastName?: string;
  email: string; // Ensure email is fetched if not already available
  phone?: string;
}

// --- Global declaration for Razorpay ---
declare global {
  interface Window { Razorpay: any; }
}

export default function StationDetailsPage() {
  const { id: stationId } = useParams(); // Get stationId from URL params
  const [station, setStation] = useState<RadioStation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isBookingSlotId, setIsBookingSlotId] = useState<string | null>(null); // Track booking state by slot ID

  // --- Razorpay Script Loading Effect ---
  useEffect(() => {
    const scriptId = "razorpay-checkout-script";
    if (document.getElementById(scriptId)) {
      return; // Script already loaded
    }
    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      console.log("Razorpay SDK loaded successfully.");
      window.Razorpay = window.Razorpay || {}; // Ensure object exists
    };
    script.onerror = () => {
      console.error("Failed to load Razorpay SDK.");
      setError("Payment gateway script failed to load. Please refresh.");
    };
    document.body.appendChild(script);

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript && document.body.contains(existingScript)) {
        document.body.removeChild(existingScript);
        console.log("Razorpay SDK script removed on unmount.");
      }
    };
  }, []);

  // --- Fetch Station Details Effect ---
  const fetchStationDetails = async (id: string | string[]) => {
    // Ensure id is a single string
    const currentStationId = Array.isArray(id) ? id[0] : id;
    if (!currentStationId) {
      setError("Station ID is missing.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    setStation(null); // Clear previous data

    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) {
        throw new Error("Authentication token not found. Please login again.");
      }
      // IMPORTANT: Confirm this backend endpoint matches your API route for fetching a RadioStation
      const response = await fetch(`${BACKEND_URL}/stations/${currentStationId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorData = await response.text(); // Read error response text
        console.error("Failed to fetch station:", response.status, errorData);
        throw new Error(`Failed to fetch station: ${response.statusText} (${response.status})`);
      }
      const data: RadioStation = await response.json();
      setStation(data);
    } catch (err) {
      console.error("Error in fetchStationDetails:", err);
      setError(err instanceof Error ? err.message : "An unknown error occurred while fetching station data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (stationId) {
      fetchStationDetails(stationId);
    } else {
      setError("No Station ID provided in URL.");
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stationId]); // Dependency on stationId from useParams

  // --- Date Formatting Utility ---
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true, // Use AM/PM
      });
    } catch (e) {
      console.error("Invalid date format:", dateString);
      return "Invalid Date";
    }
  }


  // --- Combined Booking and Payment Initiation Function ---
  async function handleBookAndPay(slot: AdvertisementSlot) {
    if (!station) return; // Should not happen if button is visible

    setIsBookingSlotId(slot.id); // Set loading state for this specific slot
    let bookingData: any; // Consider defining a Booking interface
    let paymentRecord: { paymentId: string; orderId: string; amount: number; currency: string }; // Use backend response structure
    let userData: UserData | null = null;

    try {
      const accessToken = localStorage.getItem("access_token");
      if (!accessToken) throw new Error("Authentication token not found.");
      if (!window.Razorpay || typeof window.Razorpay !== 'function') {
        console.error("Razorpay SDK is not available on window object.");
        throw new Error("Payment gateway is not ready. Please wait or refresh.");
      }

      // 1. Fetch User Details (for prefill)
      const userRes = await fetch(`${BACKEND_URL}/users/me`, { // Confirm '/users/me' endpoint
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!userRes.ok) throw new Error("Failed to fetch user details for payment.");
      userData = await userRes.json();
      if (!userData || !userData.id || !userData.email || !userData.firstName) {
        throw new Error("Incomplete user data received from backend.");
      }

      // 2. Create Booking on Backend
      const bookingPayload = {
        userId: userData.id,
        stationId: station.id,
        rjId: slot.rjId,
        slotId: slot.id,
      };
      console.log("Creating booking with payload:", bookingPayload);
      const bookingRes = await fetch(`${BACKEND_URL}/bookings`, { // Confirm '/bookings' endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(bookingPayload),
      });
      if (!bookingRes.ok) {
        const errorData = await bookingRes.json().catch(() => ({ message: "Booking creation failed with non-JSON response." }));
        console.error("Booking creation failed:", bookingRes.status, errorData);
        throw new Error(errorData.message || `Booking creation failed (Status: ${bookingRes.status})`);
      }
      bookingData = await bookingRes.json();
      console.log("Booking created successfully:", bookingData);

      // 3. Create Payment Record & Razorpay Order via Backend
      const transactionId = `txn_${userData.id}_${slot.id}_${Date.now()}`;
      const paymentPayload = {
        bookingId: bookingData.id, // Use the ID from the created booking
        amount: slot.price, // Send amount in Rupees (Float)
        transactionId: transactionId,
      };
      console.log("Creating payment order with payload:", paymentPayload);
      const orderRes = await fetch(`${BACKEND_URL}/payments`, { // Confirm '/payments' endpoint
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(paymentPayload),
      });

      if (!orderRes.ok) {
        const orderError = await orderRes.json().catch(() => ({ message: "Payment order creation failed with non-JSON response." }));
        console.error("Payment order creation failed:", orderRes.status, orderError);
        // Optional: Attempt to clean up the booking if payment order fails
        // await fetch(`${BACKEND_URL}/bookings/${bookingData.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` }});
        throw new Error(orderError.message || `Failed to create payment order (Status: ${orderRes.status})`);
      }
      // Expecting { paymentId (DB ID), orderId (Razorpay ID), amount (Paise), currency }
      paymentRecord = await orderRes.json();
      const { paymentId: dbPaymentId, orderId: razorpayOrderId } = paymentRecord;
      console.log("Payment order created:", paymentRecord);


      // 4. Configure and Open Razorpay Checkout
      const options = {
        key: RAZORPAY_KEY_ID, // From constants
        amount: paymentRecord.amount, // Use amount in PAISA from backend response
        currency: paymentRecord.currency || "INR",
        name: "Your Radio Ad Platform", // Use your actual app name
        description: `Ad Slot Booking: ${station.stationName}`,
        order_id: razorpayOrderId,
        notes: {
          database_payment_id: dbPaymentId, // Crucial: Pass YOUR DB Payment ID
          booking_id: bookingData.id,
          slot_id: slot.id,
          station_name: station.stationName,
        },
        prefill: {
          name: `${userData.firstName} ${userData.lastName || ''}`.trim(),
          email: userData.email,
          contact: userData.phone || "", // Use phone field from User model
        },
        theme: {
          color: "#3B82F6", // Example blue color
        },
        handler: async function (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string; }) {
          // --- Payment Success Handler ---
          console.log("Razorpay success response:", response);
          toast.info("Payment successful. Verifying booking...");
          try {
            // 5. Verify Payment on Backend using YOUR DB Payment ID
            const verificationPayload = {
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };
            console.log(`Verifying payment ${dbPaymentId} with payload:`, verificationPayload);

            const completeRes = await fetch(`${BACKEND_URL}/payments/complete/${dbPaymentId}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // Include Auth token if your complete endpoint requires it
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify(verificationPayload),
            });

            if (!completeRes.ok) {
              const completeError = await completeRes.json().catch(() => ({ message: "Payment verification failed with non-JSON response." }));
              console.error("Payment verification failed:", completeRes.status, completeError);
              throw new Error(completeError.message || `Payment verification failed (Status: ${completeRes.status})`);
            }

            const verificationResult = await completeRes.json();
            console.log("Payment verification successful:", verificationResult);
            toast.success(verificationResult.message || "Payment completed and slot booked! Awaiting admin approval.");

            // 6. Refresh station data to show updated slot status
            await fetchStationDetails(station.id); // Refresh with the current station's ID

          } catch (err) {
            console.error("Error during payment verification/completion:", err);
            toast.error(err instanceof Error ? err.message : "Payment verification failed.");
            toast.info("Your payment may have succeeded, but confirmation failed. Please check 'My Bookings' or contact support.");
          } finally {
            setIsBookingSlotId(null); // Reset loading state only after handler finishes
          }
        },
        modal: {
          ondismiss: function () {
            console.log(`Razorpay checkout form closed for order ${razorpayOrderId}`);
            toast.warning("Payment process cancelled.");
            // Optional: Consider backend cleanup for PENDING payment/booking if desired
            setIsBookingSlotId(null); // Reset loading state when modal is dismissed
          }
        }
      }; // End of options

      // Initialize Razorpay instance and open checkout
      const rzpInstance = new window.Razorpay(options);

      rzpInstance.on("payment.failed", function (response: any) {
        console.error("Razorpay payment.failed response:", response);
        toast.error(`Payment Failed: ${response.error?.description || 'Unknown error'}. Please try again.`);
        // Log detailed error context
        console.error(`Payment Failed Details: Code=${response.error?.code}, Source=${response.error?.source}, Step=${response.error?.step}, Reason=${response.error?.reason}, OrderID=${response.error?.metadata?.order_id}, PaymentID=${response.error?.metadata?.payment_id}`);
        // Optional: Backend cleanup
        setIsBookingSlotId(null); // Reset loading state on failure
      });

      console.log("Opening Razorpay checkout...");
      rzpInstance.open(); // Open the modal

    } catch (error) {
      console.error("Error in handleBookAndPay:", error);
      toast.error(error instanceof Error ? error.message : "An unexpected error occurred during booking.");
      setIsBookingSlotId(null); // Ensure loading state is reset on any error in the process
    }
    // Do NOT reset isBookingSlotId here; handler/ondismiss/onerror will do it.
  }

  // --- Render Logic ---
  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!station) return <ErrorState message="Station data could not be loaded or station not found." />;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Station Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4">
        <h1 className="text-3xl font-bold tracking-tight ">{station.stationName}</h1>
        {/* Potential Add: Station Logo or other header elements */}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Station Info Card */}
        <Card className="md:col-span-2 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Station Information</CardTitle>
            <CardDescription>Details about {station.stationName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <MapPin className="h-5 w-5 text-gray-500" />
              <span>{station.location}</span>
            </div>
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-500" />
              <a href={`mailto:${station.contactEmail}`} className="text-blue-600 hover:underline">{station.contactEmail}</a>
            </div>
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-gray-500" />
              <a href={`tel:${station.contactPhone}`} className="text-blue-600 hover:underline">{station.contactPhone}</a>
            </div>
            {station.description && (
              <div className="pt-3">
                <h3 className="font-medium text-gray-700 mb-1">Description</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{station.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* RJs Card */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Radio Jockeys</CardTitle>
            <CardDescription>Shows hosted at this station</CardDescription>
          </CardHeader>
          <CardContent>
            {station.rjs && station.rjs.length > 0 ? (
              <div className="space-y-4">
                {station.rjs.map((rj) => (
                  <div key={rj.id} className="border rounded-md p-3 bg-gray-50">
                    <div className="flex items-center gap-2 mb-1">
                      <Radio className="h-5 w-5 text-blue-600" />
                      <h3 className="font-semibold text-gray-800">{rj.rjName}</h3>
                    </div>
                    <div className="text-xs text-gray-600 pl-7 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Show:</span> {rj.showName}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{rj.showTiming}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 italic">No RJs listed for this station.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Advertisement Slots Section */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-xl">Advertisement Slots</CardTitle>
          <CardDescription>Select an available time slot to book your advertisement.</CardDescription>
        </CardHeader>
        <CardContent>
          {station.advertisementSlots && station.advertisementSlots.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {station.advertisementSlots
                .sort((a, b) => new Date(a.slotTime).getTime() - new Date(b.slotTime).getTime()) // Sort slots by time
                .map((slot) => {
                  const rj = station.rjs.find((r) => r.id === slot.rjId);
                  const isCurrentlyBooking = isBookingSlotId === slot.id;
                  const isBooked = slot.availabilityStatus === "BOOKED";

                  return (
                    <Card key={slot.id} className={`overflow-hidden border ${isBooked ? 'bg-gray-100' : 'bg-white'} transition-shadow hover:shadow-md`}>
                      {/* Status Banner */}
                      <div className={`px-3 py-1 text-center text-xs font-bold text-white ${isBooked ? 'bg-red-500' : 'bg-green-600'}`}>
                        {isBooked ? 'BOOKED' : 'AVAILABLE'}
                      </div>

                      <CardContent className="p-4 space-y-3">
                        {/* Slot Time */}
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                          <Calendar className="h-4 w-4 text-gray-500" />
                          <span>{formatDate(slot.slotTime)}</span>
                        </div>

                        {/* RJ Info */}
                        {rj && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 border-t pt-2 mt-2">
                            <Radio className="h-4 w-4 text-gray-500" />
                            <span>{rj.rjName} ({rj.showName})</span>
                          </div>
                        )}

                        {/* Price and Button */}
                        <div className="flex items-center justify-between pt-3">
                          <Badge variant="secondary" className="text-base font-semibold px-3 py-1">
                            ₹{slot.price.toLocaleString('en-IN')}
                          </Badge>
                          <Button
                            size="sm"
                            disabled={isBooked || isCurrentlyBooking}
                            onClick={() => handleBookAndPay(slot)}
                            className={`transition-colors ${isBooked ? 'cursor-not-allowed' : ''} ${isCurrentlyBooking ? 'w-[95px]' : 'w-[85px]'}`} // Adjust width for loader
                            aria-label={isBooked ? 'This slot is already booked' : `Book slot for ₹${slot.price}`}
                          >
                            {isCurrentlyBooking ? (
                              <Loader2 className="h-4 w-4 animate-spin" /> // Loading spinner
                            ) : isBooked ? (
                              "Booked"
                            ) : (
                              "Book Now"
                            )}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-6">No advertisement slots currently available for this station.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// --- Reusable Loading and Error Components ---
function LoadingState() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="flex justify-between items-center mb-6">
        <Skeleton className="h-10 w-1/3 rounded" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Skeleton className="h-48 md:col-span-2 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center justify-center text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-red-500 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <h2 className="text-2xl font-semibold text-red-600 mb-2">An Error Occurred</h2>
      <p className="text-gray-600 mb-6 max-w-md">{message}</p>
      <Button onClick={() => window.location.reload()} variant="outline">
        Try Reloading Page
      </Button>
    </div>
  );
}