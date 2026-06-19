package com.dashboardplatform.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.server.ResponseStatusException;

@Controller
public class SpaForwardController {
    @GetMapping("/")
    public String forwardRoot() {
        return "forward:/index.html";
    }

    @GetMapping({"/{path:^(?!api$|assets$)[^.]*}", "/{path:^(?!api$|assets$)[^.]*}/**"})
    public String forwardClientRoute(HttpServletRequest request) {
        String path = request.getRequestURI();
        if (path.contains(".")) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return "forward:/index.html";
    }
}
