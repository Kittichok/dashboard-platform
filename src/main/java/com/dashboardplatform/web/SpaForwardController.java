package com.dashboardplatform.web;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class SpaForwardController {
    @GetMapping("/**")
    public Object forwardClientRoute(HttpServletRequest request) {
        var path = request.getRequestURI();
        if (path.startsWith("/api/") || path.equals("/api") || hasFileExtension(path)) {
            return ResponseEntity.notFound().build();
        }
        return "forward:/index.html";
    }

    private boolean hasFileExtension(String path) {
        var lastSlash = path.lastIndexOf('/');
        var lastDot = path.lastIndexOf('.');
        return lastDot > lastSlash;
    }
}
