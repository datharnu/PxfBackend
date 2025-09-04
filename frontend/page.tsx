// "use client";
// import { useEffect, useRef, useState, ChangeEvent, FormEvent } from "react";
// import { useInView } from "react-intersection-observer";
// import { z } from "zod";
// import Navbar from "@/components/shared/Navbar";
// import StepOne from "./components/StepOne";
// import StepTwo from "./components/StepTwo";
// import StepThree from "./components/StepThree";
// import StepFour from "./components/StepFour";
// import StepFive from "./components/StepFive";
// import EventSuccessModal from "./components/EventSuccessModal";
// import {
//   createEvent,
//   ApiError,
//   GUEST_LIMIT_OPTIONS,
//   PHOTO_CAP_LIMIT_OPTIONS,
//   isValidUrl,
//   isValidFutureDate,
//   CreateEventPayload,
// } from "../utils/api";
// import { initPayment, initCustomPayment } from "../utils/api";
// import { isAuthenticated } from "../utils/auth";
// import {
//   FormData,
//   ValidationState,
//   GuestLimitOptions,
//   PhotoCapLimitOptions,
// } from "../../types/event";

// // Zod schema matching your backend
// const createEventSchema = z
//   .object({
//     title: z.string().min(3, "Title must be at least 3 characters"),
//     description: z
//       .string()
//       .min(10, "Description must be at least 10 characters"),
//     eventFlyer: z.string().url("Event Flyer must be a valid URL").optional(),
//     guestLimit: z.union([
//       z.enum(["10", "100", "250", "500", "800", "1000+"]),
//       z.literal("CUSTOM"),
//     ]),
//     photoCapLimit: z.union([
//       z.enum(["5", "10", "15", "20", "25"]),
//       z.literal("CUSTOM"),
//     ]),
//     customGuestLimit: z.number().int().min(1001).optional(),
//     eventDate: z.string().refine((date) => !isNaN(Date.parse(date)), {
//       message: "Event Date must be a valid date",
//     }),
//     isPasswordProtected: z.boolean(),
//     customPassword: z
//       .string()
//       .min(4, "Custom Password must be at least 4 characters")
//       .optional(),
//   })
//   .refine(
//     (data) =>
//       data.guestLimit !== "CUSTOM" ||
//       (typeof data.customGuestLimit === "number" &&
//         data.customGuestLimit >= 1001),
//     {
//       message: "customGuestLimit must be provided and >= 1001 for CUSTOM",
//       path: ["customGuestLimit"],
//     }
//   );

// type FormFieldNames = keyof FormData;

// const MultiStepForm: React.FC = () => {
//   const [currentStep, setCurrentStep] = useState<number>(1);
//   const totalSteps: number = 5;
//   const formContainerRef = useRef<HTMLDivElement>(null);

//   const [formData, setFormData] = useState<FormData>({
//     title: "",
//     description: "",
//     eventFlyer: "",
//     guestLimit: "10",
//     photoCapLimit: "5",
//     eventDate: "",
//     isPasswordProtected: false,
//     customPassword: "",
//     customGuestLimit: undefined,
//   });

//   const [validation, setValidation] = useState<ValidationState>({
//     title: false,
//     description: false,
//     eventFlyer: true, // Optional field, starts as valid
//     guestLimit: true, // Has default value
//     photoCapLimit: true, // Has default value
//     eventDate: false,
//     isPasswordProtected: true, // Boolean, always valid
//     customPassword: true, // Optional initially
//     customGuestLimit: true,
//   });

//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [submitError, setSubmitError] = useState<string>("");
//   const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
//   const [showSuccessModal, setShowSuccessModal] = useState(false);
//   const [createdEventData, setCreatedEventData] = useState<{
//     id: string;
//     title: string;
//     description: string;
//     eventDate: string | null; // Allow null
//     eventSlug: string;
//     qrCodeData: string;
//     isPasswordProtected: boolean;
//     accessPassword?: string | null; // Allow null
//     guestLimit: string; // Add this
//     photoCapLimit: string; // Add this
//     eventFlyer?: string | null; // Add this, allow null
//   } | null>(null);

//   // Step refs for detecting which step is in view
//   const [stepOneRef, stepOneInView] = useInView({ threshold: 0.6 });
//   const [stepTwoRef, stepTwoInView] = useInView({ threshold: 0.6 });
//   const [stepThreeRef, stepThreeInView] = useInView({ threshold: 0.6 });
//   const [stepFourRef, stepFourInView] = useInView({ threshold: 0.6 });
//   const [stepFiveRef, stepFiveInView] = useInView({ threshold: 0.6 });

//   // Track current step in view
//   useEffect(() => {
//     if (stepOneInView) setCurrentStep(1);
//     else if (stepTwoInView) setCurrentStep(2);
//     else if (stepThreeInView) setCurrentStep(3);
//     else if (stepFourInView) setCurrentStep(4);
//     else if (stepFiveInView) setCurrentStep(5);
//   }, [
//     stepOneInView,
//     stepTwoInView,
//     stepThreeInView,
//     stepFourInView,
//     stepFiveInView,
//   ]);

//   // Update password validation when isPasswordProtected changes
//   useEffect(() => {
//     if (formData.isPasswordProtected) {
//       setValidation((prev) => ({
//         ...prev,
//         customPassword: formData.customPassword.length >= 4,
//       }));
//     } else {
//       setValidation((prev) => ({
//         ...prev,
//         customPassword: true,
//       }));
//     }
//   }, [formData.isPasswordProtected, formData.customPassword]);

//   const validateField = (name: FormFieldNames, value: unknown): boolean => {
//     switch (name) {
//       case "title":
//         return typeof value === "string" && value.trim().length >= 3;
//       case "description":
//         return typeof value === "string" && value.trim().length >= 10;
//       case "eventFlyer":
//         return value === "" || (typeof value === "string" && isValidUrl(value));
//       case "guestLimit":
//         return (
//           typeof value === "string" &&
//           (value === "CUSTOM" ||
//             GUEST_LIMIT_OPTIONS.includes(value as GuestLimitOptions))
//         );
//       case "photoCapLimit":
//         return (
//           typeof value === "string" &&
//           (value === "CUSTOM" ||
//             PHOTO_CAP_LIMIT_OPTIONS.includes(value as PhotoCapLimitOptions))
//         );
//       case "eventDate":
//         return typeof value === "string" && isValidFutureDate(value);
//       case "isPasswordProtected":
//         return typeof value === "boolean";
//       case "customPassword":
//         return (
//           !formData.isPasswordProtected ||
//           (typeof value === "string" && value.length >= 4)
//         );
//       case "customGuestLimit":
//         return (
//           formData.guestLimit !== "CUSTOM" ||
//           (typeof value === "number" &&
//             Number.isInteger(value) &&
//             value >= 1001)
//         );
//       default:
//         return true;
//     }
//   };

//   const handleChange = (
//     e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
//   ): void => {
//     const { name, value, type } = e.target;
//     const target = e.target as HTMLInputElement;
//     const checked = target.checked;

//     const actualValue =
//       type === "checkbox"
//         ? checked
//         : name === "customGuestLimit"
//         ? Number(value)
//         : value;

//     setFormData((prev) => ({ ...prev, [name]: actualValue }));

//     // Clear field error when user starts typing
//     if (fieldErrors[name]) {
//       setFieldErrors((prev) => {
//         const newErrors = { ...prev };
//         delete newErrors[name];
//         return newErrors;
//       });
//     }

//     // Validate field
//     const isValid = validateField(name as FormFieldNames, actualValue);
//     setValidation((prev) => ({
//       ...prev,
//       [name]: isValid,
//     }));
//   };

//   const canGoToNextStep = (step: number): boolean => {
//     switch (step) {
//       case 1:
//         return validation.title;
//       case 2:
//         return validation.description;
//       case 3:
//         return validation.eventFlyer;
//       case 4:
//         return validation.guestLimit && validation.customGuestLimit !== false;
//       case 5:
//         return (
//           validation.photoCapLimit &&
//           validation.eventDate &&
//           validation.customPassword
//         );
//       default:
//         return false;
//     }
//   };

//   const goToNextStep = (e: { preventDefault: () => void }) => {
//     e.preventDefault();

//     if (!canGoToNextStep(currentStep)) {
//       setSubmitError("Please fill in all required fields correctly");
//       return;
//     }

//     const nextStep = currentStep + 1;
//     if (nextStep <= totalSteps) {
//       setSubmitError(""); // Clear any previous errors
//       const nextSection = document.getElementById(`step${nextStep}`);
//       nextSection?.scrollIntoView({ behavior: "smooth" });
//     }
//   };

//   // const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
//   //   e.preventDefault();

//   //   // Check authentication first
//   //   if (!isAuthenticated()) {
//   //     setSubmitError("Please sign in to create an event");
//   //     return;
//   //   }

//   //   setIsSubmitting(true);
//   //   setSubmitError("");
//   //   setFieldErrors({});

//   //   try {
//   //     // Prepare payload for API
//   //     const payload: CreateEventPayload = {
//   //       title: formData.title,
//   //       description: formData.description,
//   //       eventFlyer: formData.eventFlyer || undefined,
//   //       guestLimit: formData.guestLimit as GuestLimitOptions,
//   //       photoCapLimit: formData.photoCapLimit as PhotoCapLimitOptions,
//   //       eventDate: formData.eventDate,
//   //       isPasswordProtected: formData.isPasswordProtected,
//   //       customPassword: formData.isPasswordProtected
//   //         ? formData.customPassword
//   //         : undefined,
//   //     };

//   //     // Validate with Zod schema before sending
//   //     createEventSchema.parse(payload);

//   //     // Submit to API
//   //     console.log("Submitting payload:", payload);
//   //     const eventData = await createEvent(payload);
//   //     console.log("API response:", eventData);

//   //     // Show success modal with event data
//   //     setCreatedEventData({
//   //       id: eventData.id,
//   //       title: eventData.title,
//   //       description: eventData.description,
//   //       eventDate: eventData.eventDate,
//   //       eventSlug: eventData.eventSlug,
//   //       qrCodeData: eventData.qrCodeData,
//   //       isPasswordProtected: eventData.isPasswordProtected,
//   //       accessPassword: eventData.accessPassword,
//   //       guestLimit: eventData.guestLimit,
//   //       photoCapLimit: eventData.photoCapLimit,
//   //       eventFlyer: eventData.eventFlyer,
//   //     });
//   //     setShowSuccessModal(true);
//   //   } catch (error) {
//   //     console.error("Error creating event:", error);

//   //     if (error instanceof z.ZodError) {
//   //       // Handle Zod validation errors
//   //       const errors: Record<string, string> = {};
//   //       error.errors.forEach((err) => {
//   //         if (err.path.length > 0) {
//   //           errors[err.path[0] as string] = err.message;
//   //         }
//   //       });
//   //       setFieldErrors(errors);
//   //       setSubmitError("Please check all fields and try again");
//   //     } else if (error instanceof ApiError) {
//   //       // Handle API errors
//   //       if (error.errors) {
//   //         const errors: Record<string, string> = {};
//   //         Object.entries(error.errors).forEach(([field, messages]) => {
//   //           errors[field] = messages[0]; // Take first error message
//   //         });
//   //         setFieldErrors(errors);
//   //       }
//   //       setSubmitError(error.message);
//   //     } else {
//   //       // Handle unexpected errors
//   //       setSubmitError("An unexpected error occurred. Please try again.");
//   //     }
//   //   } finally {
//   //     setIsSubmitting(false);
//   //   }
//   // };

//   const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
//     e.preventDefault();

//     // Check authentication first
//     if (!isAuthenticated()) {
//       setSubmitError("Please sign in to create an event");
//       return;
//     }

//     setIsSubmitting(true);
//     setSubmitError("");
//     setFieldErrors({});

//     try {
//       // Prepare payload for API
//       const payload: CreateEventPayload = {
//         title: formData.title,
//         description: formData.description,
//         eventFlyer: formData.eventFlyer || undefined,
//         guestLimit: formData.guestLimit as GuestLimitOptions,
//         photoCapLimit: formData.photoCapLimit as PhotoCapLimitOptions,
//         eventDate: formData.eventDate,
//         isPasswordProtected: formData.isPasswordProtected,
//         customPassword: formData.isPasswordProtected
//           ? formData.customPassword
//           : undefined,
//       };

//       // For CUSTOM, extend payload with customGuestLimit and relax enums at compile-time
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       const finalPayload: any = { ...payload };
//       if (
//         (formData.guestLimit === "CUSTOM" ||
//           formData.photoCapLimit === "CUSTOM") &&
//         typeof formData.customGuestLimit === "number"
//       ) {
//         finalPayload.guestLimit = formData.guestLimit;
//         finalPayload.photoCapLimit = formData.photoCapLimit;
//         finalPayload.customGuestLimit = formData.customGuestLimit;
//       }

//       // Validate with Zod schema before sending
//       createEventSchema.parse({ ...finalPayload });

//       console.log("Sending payload to API:", payload);

//       // Submit to API (event creation)
//       const apiResponse = await createEvent(finalPayload as CreateEventPayload);

//       console.log("Full API Response:", apiResponse);
//       console.log("API Response Type:", typeof apiResponse);
//       console.log(
//         "API Response Keys:",
//         apiResponse ? Object.keys(apiResponse) : "null/undefined"
//       );

//       // Handle different response structures
//       // eslint-disable-next-line @typescript-eslint/no-explicit-any
//       let eventData: any;

//       // Check if response is wrapped in a data property (common pattern)
//       if (apiResponse && typeof apiResponse === "object") {
//         if ("data" in apiResponse && apiResponse.data) {
//           console.log("Response has data property:", apiResponse.data);
//           eventData = apiResponse.data;
//         } else if ("event" in apiResponse && apiResponse.event) {
//           console.log("Response has event property:", apiResponse.event);
//           eventData = apiResponse.event;
//         } else {
//           console.log("Using direct response:", apiResponse);
//           eventData = apiResponse;
//         }
//       } else {
//         throw new Error("Invalid API response format");
//       }

//       console.log("Extracted event data:", eventData);

//       // Define a type for the extracted event data
//       interface ExtractedEventData {
//         id?: string;
//         _id?: string;
//         eventId?: string;
//         title?: string;
//         description?: string;
//         eventDate?: string;
//         date?: string;
//         createdAt?: string;
//         eventSlug?: string;
//         slug?: string;
//         qrCodeData?: string;
//         qrCode?: string;
//         qr_code?: string;
//         qrCodeUrl?: string;
//         isPasswordProtected?: boolean;
//         accessPassword?: string;
//         password?: string;
//         customPassword?: string;
//         guestLimit?: string;
//         photoCapLimit?: string;
//         eventFlyer?: string;
//       }

//       // Cast to our extracted event data type
//       const extractedData = eventData as ExtractedEventData;

//       // Map the response to match the expected modal data structure
//       const modalData = {
//         id:
//           extractedData.id || extractedData._id || extractedData.eventId || "",
//         title: extractedData.title || formData.title,
//         description: extractedData.description || formData.description,
//         eventDate:
//           extractedData.eventDate ||
//           extractedData.date ||
//           extractedData.createdAt ||
//           formData.eventDate,
//         eventSlug:
//           extractedData.eventSlug ||
//           extractedData.slug ||
//           extractedData.id ||
//           "",
//         qrCodeData:
//           extractedData.qrCodeData ||
//           extractedData.qrCode ||
//           extractedData.qr_code ||
//           extractedData.qrCodeUrl ||
//           "",
//         isPasswordProtected:
//           extractedData.isPasswordProtected ?? formData.isPasswordProtected,
//         accessPassword:
//           extractedData.accessPassword ||
//           extractedData.password ||
//           extractedData.customPassword ||
//           (formData.isPasswordProtected ? formData.customPassword : null),
//         guestLimit: extractedData.guestLimit || formData.guestLimit,
//         photoCapLimit: extractedData.photoCapLimit || formData.photoCapLimit,
//         eventFlyer: extractedData.eventFlyer || formData.eventFlyer || null,
//       };

//       console.log("Final modal data:", modalData);

//       // Validate that we have essential data
//       if (!modalData.id && !modalData.eventSlug) {
//         console.warn("Missing essential event identifiers");
//       }

//       // If plan is free (guestLimit === "10" and photoCapLimit === "5"), show success immediately
//       const isFreePlan =
//         (payload.guestLimit === "10" && payload.photoCapLimit === "5") ||
//         payload.guestLimit === "10"; // fallback to Basic by default

//       if (isFreePlan) {
//         setCreatedEventData(modalData);
//         setShowSuccessModal(true);
//         return;
//       }

//       // For paid plans, initialize payment and redirect to Paystack
//       const eventId = modalData.id || modalData.eventSlug;
//       if (!eventId) {
//         throw new Error("Missing event identifier for payment initialization");
//       }

//       // Get email from local store or prompt user if needed
//       const storedEmail =
//         typeof window !== "undefined"
//           ? JSON.parse(localStorage.getItem("email-storage") || "null")?.state
//               ?.email || null
//           : null;

//       if (!storedEmail) {
//         setCreatedEventData(modalData);
//         setShowSuccessModal(true);
//         return;
//       }

//       // Decide between standard and custom init endpoints
//       const isCustom =
//         payload.guestLimit === "CUSTOM" || payload.photoCapLimit === "CUSTOM";

//       const paymentInit = isCustom
//         ? await initCustomPayment({
//             eventId,
//             customGuestLimit: Number(formData.customGuestLimit),
//             email: storedEmail,
//           })
//         : await initPayment({
//             eventId,
//             guestLimit: payload.guestLimit,
//             photoCapLimit: payload.photoCapLimit,
//             email: storedEmail,
//           });

//       if (paymentInit && paymentInit.authorizationUrl) {
//         window.location.href = paymentInit.authorizationUrl;
//         return;
//       }

//       // Fallback: show modal if no auth URL
//       setCreatedEventData(modalData);
//       setShowSuccessModal(true);
//     } catch (error) {
//       console.error("Error creating event:", error);

//       if (error instanceof z.ZodError) {
//         // Handle Zod validation errors
//         const errors: Record<string, string> = {};
//         error.errors.forEach((err) => {
//           if (err.path.length > 0) {
//             errors[err.path[0] as string] = err.message;
//           }
//         });
//         setFieldErrors(errors);
//         setSubmitError("Please check all fields and try again");
//       } else if (error instanceof ApiError) {
//         // Handle API errors
//         if (error.errors) {
//           const errors: Record<string, string> = {};
//           Object.entries(error.errors).forEach(([field, messages]) => {
//             errors[field] = Array.isArray(messages) ? messages[0] : messages;
//           });
//           setFieldErrors(errors);
//         }
//         setSubmitError(error.message);
//       } else {
//         // Handle unexpected errors
//         setSubmitError("An unexpected error occurred. Please try again.");
//       }
//     } finally {
//       setIsSubmitting(false);
//     }
//   };
//   return (
//     <div className="relative">
//       <Navbar />

//       {/* Progress Bar */}
//       <div className="fixed top-0 left-0 w-full h-1 bg-gray-800 z-20">
//         <div
//           className="h-full bg-white transition-all duration-300 ease-in-out"
//           style={{
//             width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
//           }}
//         />
//       </div>

//       {/* Error Message */}
//       {submitError && (
//         <div className="fixed top-4 left-4 right-4 bg-red-600 text-white p-3 rounded-lg z-30 flex items-center justify-between">
//           <span>{submitError}</span>
//           <button
//             onClick={() => setSubmitError("")}
//             className="ml-2 text-white hover:text-gray-200"
//           >
//             ×
//           </button>
//         </div>
//       )}

//       {/* Loading Overlay */}
//       {isSubmitting && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
//           <div className="bg-white p-6 rounded-lg flex items-center gap-3">
//             <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
//             <span className="text-gray-900">Creating your event...</span>
//           </div>
//         </div>
//       )}

//       {/* Form Steps */}
//       <div
//         className="bg-primary min-h-screen text-white overflow-y-auto snap-y snap-mandatory"
//         ref={formContainerRef}
//       >
//         <div id="step1" ref={stepOneRef} className="snap-start">
//           <StepOne
//             formData={formData}
//             handleChange={handleChange}
//             validation={validation}
//             goToNextStep={goToNextStep}
//             fieldError={fieldErrors.title}
//           />
//         </div>

//         <div id="step2" ref={stepTwoRef} className="snap-start">
//           <StepTwo
//             formData={formData}
//             handleChange={handleChange}
//             validation={validation}
//             goToNextStep={goToNextStep}
//             fieldError={fieldErrors.description}
//           />
//         </div>

//         <div id="step3" ref={stepThreeRef} className="snap-start">
//           <StepThree
//             formData={formData}
//             handleChange={handleChange}
//             validation={validation}
//             goToNextStep={goToNextStep}
//             fieldError={fieldErrors.eventFlyer}
//           />
//         </div>

//         <div id="step4" ref={stepFourRef} className="snap-start">
//           <StepFour
//             formData={formData}
//             handleChange={handleChange}
//             validation={validation}
//             goToNextStep={goToNextStep}
//             fieldError={fieldErrors.guestLimit}
//           />
//         </div>

//         <div id="step5" ref={stepFiveRef} className="snap-start">
//           <StepFive
//             formData={formData}
//             handleChange={handleChange}
//             validation={validation}
//             handleSubmit={handleSubmit}
//             isSubmitting={isSubmitting}
//             fieldErrors={fieldErrors}
//           />
//         </div>
//       </div>

//       {/* Magnifier Button */}
//       <button
//         className="fixed bottom-6 right-6 w-10 h-10 bg-yellow-800 rounded-full flex items-center justify-center z-20"
//         aria-label="Search"
//       >
//         <svg
//           width="20"
//           height="20"
//           viewBox="0 0 24 24"
//           fill="none"
//           xmlns="http://www.w3.org/2000/svg"
//         >
//           <path
//             d="M15.5 14H14.71L14.43 13.73C15.41 12.59 16 11.11 16 9.5C16 5.91 13.09 3 9.5 3C5.91 3 3 5.91 3 9.5C3 13.09 5.91 16 9.5 16C11.11 16 12.59 15.41 13.73 14.43L14 14.71V15.5L19 20.49L20.49 19L15.5 14ZM9.5 14C7.01 14 5 11.99 5 9.5C5 7.01 7.01 5 9.5 5C11.99 5 14 7.01 14 9.5C14 11.99 11.99 14 9.5 14Z"
//             fill="white"
//           />
//         </svg>
//       </button>

//       {/* Success Modal */}
//       {createdEventData && (
//         <EventSuccessModal
//           eventData={createdEventData}
//           isOpen={showSuccessModal}
//           onClose={() => setShowSuccessModal(false)}
//         />
//       )}
//     </div>
//   );
// };

// export default MultiStepForm;
