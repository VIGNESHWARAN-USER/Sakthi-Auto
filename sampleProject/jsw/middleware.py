from django.utils.timezone import now

class SimpleMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Code executed before the view is called
        print(f"Request received at {now()} for {request.path}")

        response = self.get_response(request)

        # Code executed after the view is called
        print(f"Response sent at {now()}")

        return response
